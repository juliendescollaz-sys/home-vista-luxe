import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiter (in-memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔓 Redeeming pair code...');

    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const { code } = await req.json();
    if (!code) {
      throw new Error('Missing code parameter');
    }

    // Verify JWT
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(code, secret, {
      issuer: 'app',
    });

    const { jti, linkId } = payload as { jti: string; linkId: string };
    if (!jti || !linkId) {
      throw new Error('Invalid token payload');
    }

    console.log('✅ JWT verified:', jti);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if code exists and is valid
    const { data: pairCode, error: fetchError } = await supabaseAdmin
      .from('pair_codes')
      .select('*')
      .eq('code_jwt_id', jti)
      .single();

    if (fetchError || !pairCode) {
      console.error('❌ Pair code not found:', fetchError);
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
      throw updateError;
    }

    console.log('✅ Code marked as used');

    // Fetch HA link
    const { data: haLink, error: linkError } = await supabaseAdmin
      .from('ha_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (linkError || !haLink) {
      console.error('❌ HA link not found:', linkError);
      throw new Error('HA link not found');
    }

    // Decrypt token
    const secret_key = Deno.env.get('SECRET_KEY');
    if (!secret_key) {
      throw new Error('SECRET_KEY not configured');
    }

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(secret_key.padEnd(32, '0').slice(0, 32));
    
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});