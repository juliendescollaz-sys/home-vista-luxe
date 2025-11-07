import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const pairRedeemSchema = z.object({
  code: z.string().min(50).max(2000)
});

// Database-backed rate limiter
async function checkRateLimit(supabaseAdmin: any, ip: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60000); // 1 minute window
  const MAX_REQUESTS = 10;

  try {
    // Get or create rate limit record
    const { data: existing } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('identifier', ip)
      .eq('endpoint', 'pair-redeem')
      .gte('window_start', windowStart.toISOString())
      .single();

    if (existing) {
      if (existing.request_count >= MAX_REQUESTS) {
        return false;
      }
      // Increment counter
      await supabaseAdmin
        .from('rate_limits')
        .update({ request_count: existing.request_count + 1 })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabaseAdmin
        .from('rate_limits')
        .insert({
          identifier: ip,
          endpoint: 'pair-redeem',
          request_count: 1,
          window_start: now.toISOString()
        });
    }

    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open on error to avoid blocking legitimate requests
    return true;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔓 Redeeming pair code...');

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Database-backed rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!await checkRateLimit(supabaseAdmin, clientIp)) {
      throw new Error('Rate limit exceeded');
    }

    // Validate input
    const body = await req.json();
    const validationResult = pairRedeemSchema.safeParse(body);
    if (!validationResult.success) {
      throw new Error('Invalid input format');
    }

    const { code } = validationResult.data;

    // Verify JWT
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      throw new Error('Server configuration error');
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(code, secret, {
      issuer: 'app',
    });

    const { jti, linkId } = payload as { jti: string; linkId: string };
    if (!jti || !linkId) {
      throw new Error('Invalid code format');
    }

    console.log('✅ JWT verified:', jti);

    // Check if code exists and is valid
    const { data: pairCode, error: fetchError } = await supabaseAdmin
      .from('pair_codes')
      .select('*')
      .eq('code_jwt_id', jti)
      .single();

    if (fetchError || !pairCode) {
      console.error('❌ Pair code not found');
      throw new Error('Invalid or expired code');
    }

    // Check if already used
    if (pairCode.used_at) {
      console.error('❌ Code already used');
      throw new Error('Code already used');
    }

    // Check expiration
    if (new Date(pairCode.expires_at) < new Date()) {
      console.error('❌ Code expired');
      throw new Error('Code expired');
    }

    // Mark as used
    const { error: updateError } = await supabaseAdmin
      .from('pair_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', pairCode.id);

    if (updateError) {
      console.error('❌ Error marking code as used:', updateError);
      throw new Error('Failed to process code');
    }

    console.log('✅ Code marked as used');

    // Fetch HA link
    const { data: haLink, error: linkError } = await supabaseAdmin
      .from('ha_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (linkError || !haLink) {
      console.error('❌ HA link not found');
      throw new Error('Configuration not found');
    }

    // Decrypt token with strong key validation
    const secret_key = Deno.env.get('SECRET_KEY');
    if (!secret_key || secret_key.length < 32) {
      console.error('SECRET_KEY must be at least 32 characters');
      throw new Error('Server configuration error');
    }

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(secret_key.slice(0, 32));
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const encryptedData = new Uint8Array(haLink.ha_token_enc);
    const nonce = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const accessToken = decoder.decode(decrypted);

    console.log('✅ Token decrypted successfully');

    return new Response(
      JSON.stringify({
        ha_base_url: haLink.ha_base_url,
        access_token: accessToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    // Return generic error message to client
    const clientMessage = message.includes('Rate limit') ? 'Too many requests' :
                         message.includes('Invalid') || message.includes('expired') ? message :
                         'An error occurred';
    return new Response(
      JSON.stringify({ error: clientMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
