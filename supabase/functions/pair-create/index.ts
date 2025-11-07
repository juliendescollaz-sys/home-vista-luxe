import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎫 Creating pair code...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { linkId, haBaseUrl, haToken } = await req.json();
    
    let finalLinkId = linkId;

    // If haToken provided, create or update HA link
    if (haToken && haBaseUrl) {
      console.log('🔐 Encrypting HA token...');
      
      // Encrypt token with AES-GCM
      const secret = Deno.env.get('SECRET_KEY');
      if (!secret) {
        throw new Error('SECRET_KEY not configured');
      }

      const encoder = new TextEncoder();
      const keyMaterial = encoder.encode(secret.padEnd(32, '0').slice(0, 32));
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const tokenData = encoder.encode(haToken);
      
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        key,
        tokenData
      );

      // Combine nonce + ciphertext
      const encryptedData = new Uint8Array(nonce.length + ciphertext.byteLength);
      encryptedData.set(nonce, 0);
      encryptedData.set(new Uint8Array(ciphertext), nonce.length);

      // Store in database
      const { data: linkData, error: linkError } = await supabaseClient
        .from('ha_links')
        .insert({
          user_id: user.id,
          ha_base_url: haBaseUrl,
          ha_token_enc: encryptedData,
        })
        .select()
        .single();

      if (linkError) {
        console.error('❌ Error creating HA link:', linkError);
        throw linkError;
      }

      finalLinkId = linkData.id;
      console.log('✅ HA link created:', finalLinkId);
    }

    if (!finalLinkId) {
      throw new Error('linkId or haToken+haBaseUrl required');
    }

    // Generate JWT for pair code
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const jti = crypto.randomUUID();
    const exp = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes

    const secret = new TextEncoder().encode(jwtSecret);
    const jwt = await new jose.SignJWT({
      linkId: finalLinkId,
      v: 1,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('app')
      .setSubject(user.id)
      .setJti(jti)
      .setExpirationTime(exp)
      .sign(secret);

    // Store pair code in database
    const { error: pairError } = await supabaseClient
      .from('pair_codes')
      .insert({
        code_jwt_id: jti,
        user_id: user.id,
        link_id: finalLinkId,
        expires_at: new Date(exp * 1000).toISOString(),
      });

    if (pairError) {
      console.error('❌ Error creating pair code:', pairError);
      throw pairError;
    }

    const qrUri = `ha-pair://v1?code=${jwt}`;
    console.log('✅ Pair code created successfully');

    return new Response(
      JSON.stringify({ qr_uri: qrUri, expires_in: 600 }),
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