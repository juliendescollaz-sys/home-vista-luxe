/**
 * Kamailio Sync Edge Function
 *
 * Synchronise les comptes SIP entre Supabase et Kamailio
 *
 * IMPORTANT: Cette fonction necessite que Kamailio soit configure avec:
 * 1. Module auth_db charge
 * 2. Base de donnees MySQL pour les subscribers
 * 3. jsonrpc accessible (optionnel, pour monitoring)
 *
 * Pour l'instant, le serveur Kamailio (sip.neolia.app) n'a PAS le module auth.
 * Cette fonction est preparee pour quand l'auth sera configuree.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation
const syncRequestSchema = z.object({
  action: z.enum(["sync_all", "create_account", "delete_account", "check_status"]),
  account_id: z.string().uuid().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

// Kamailio config from environment
const KAMAILIO_HOST = Deno.env.get("KAMAILIO_HOST") || "141.227.158.64";
const KAMAILIO_DOMAIN = Deno.env.get("KAMAILIO_DOMAIN") || "sip.neolia.app";
const KAMAILIO_SSH_KEY = Deno.env.get("KAMAILIO_SSH_KEY"); // Private key for SSH
const KAMAILIO_DB_HOST = Deno.env.get("KAMAILIO_DB_HOST") || "localhost";
const KAMAILIO_DB_USER = Deno.env.get("KAMAILIO_DB_USER") || "kamailio";
const KAMAILIO_DB_PASS = Deno.env.get("KAMAILIO_DB_PASS");
const KAMAILIO_DB_NAME = Deno.env.get("KAMAILIO_DB_NAME") || "kamailio";

interface SyncResult {
  success: boolean;
  action: string;
  accounts_created: number;
  accounts_updated: number;
  accounts_deleted: number;
  errors: string[];
  warnings: string[];
}

/**
 * Genere un mot de passe SIP securise
 */
function generateSIPPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

/**
 * Calcule le hash HA1 pour SIP Digest Auth
 * HA1 = MD5(username:realm:password)
 */
async function calculateHA1(username: string, realm: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${username}:${realm}:${password}`);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Execute une commande kamctl via l'API JSONRPC de Kamailio
 * (si le module jsonrpcs est charge et expose sur un port)
 */
async function kamailioRPC(method: string, params: unknown[] = []): Promise<unknown> {
  // TODO: Implementer quand Kamailio expose JSONRPC sur HTTP
  // Pour l'instant, on utilise SSH via kamctl
  throw new Error("JSONRPC not implemented yet - use SSH method");
}

/**
 * Verifie le statut de connexion avec Kamailio
 */
async function checkKamailioStatus(): Promise<{
  connected: boolean;
  auth_enabled: boolean;
  registered_users: number;
  message: string;
}> {
  // TODO: Implementer la verification reelle via SSH ou JSONRPC
  // Pour l'instant, retourne un statut statique basé sur notre analyse

  return {
    connected: true,
    auth_enabled: false, // Le module auth n'est PAS charge sur sip.neolia.app
    registered_users: 0,
    message: "Kamailio est actif mais le module auth n'est pas configure. Les comptes SIP ne peuvent pas etre crees tant que auth_db n'est pas active.",
  };
}

/**
 * Synchronise tous les comptes SIP avec Kamailio
 */
async function syncAllAccounts(supabase: ReturnType<typeof createClient>): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    action: "sync_all",
    accounts_created: 0,
    accounts_updated: 0,
    accounts_deleted: 0,
    errors: [],
    warnings: [],
  };

  // Verifier d'abord le statut de Kamailio
  const status = await checkKamailioStatus();

  if (!status.auth_enabled) {
    result.errors.push(
      "Le module auth n'est pas configure sur Kamailio. " +
      "Veuillez d'abord activer auth_db dans kamailio.cfg"
    );
    return result;
  }

  // Recuperer tous les comptes SIP actifs depuis Supabase
  const { data: accounts, error } = await supabase
    .from("sip_accounts")
    .select("*")
    .eq("enabled", true);

  if (error) {
    result.errors.push(`Erreur Supabase: ${error.message}`);
    return result;
  }

  if (!accounts || accounts.length === 0) {
    result.warnings.push("Aucun compte SIP a synchroniser");
    result.success = true;
    return result;
  }

  // TODO: Pour chaque compte, verifier s'il existe dans Kamailio
  // et creer/mettre a jour si necessaire

  for (const account of accounts) {
    try {
      // Verifier si le compte existe deja dans Kamailio
      // const exists = await checkKamailioUser(account.username);

      // Si non, le creer
      // if (!exists) {
      //   const password = account.password_hash ? decryptPassword(account.password_hash) : generateSIPPassword();
      //   await createKamailioUser(account.username, password);
      //   result.accounts_created++;
      // }

      result.warnings.push(`Compte ${account.username} - sync non implementee`);
    } catch (err) {
      result.errors.push(`Erreur pour ${account.username}: ${err}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Cree un compte SIP sur Kamailio
 */
async function createSIPAccount(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  username?: string,
  password?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    action: "create_account",
    accounts_created: 0,
    accounts_updated: 0,
    accounts_deleted: 0,
    errors: [],
    warnings: [],
  };

  // Verifier le statut de Kamailio
  const status = await checkKamailioStatus();

  if (!status.auth_enabled) {
    result.errors.push(
      "Impossible de creer le compte: le module auth n'est pas configure sur Kamailio"
    );
    return result;
  }

  // Recuperer le compte depuis Supabase
  const { data: account, error } = await supabase
    .from("sip_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (error || !account) {
    result.errors.push(`Compte non trouve: ${accountId}`);
    return result;
  }

  // Generer un mot de passe si non fourni
  const sipPassword = password || generateSIPPassword();

  // Calculer le hash HA1
  const ha1 = await calculateHA1(account.username, KAMAILIO_DOMAIN, sipPassword);

  // TODO: Creer le compte dans Kamailio via:
  // Option 1: SSH + kamctl add
  // Option 2: MySQL direct insert dans table subscriber
  // Option 3: JSONRPC si expose

  result.warnings.push(
    `Compte ${account.username} prepare avec HA1=${ha1.substring(0, 8)}... ` +
    `mais creation Kamailio non implementee`
  );

  // Mettre a jour le hash dans Supabase
  await supabase
    .from("sip_accounts")
    .update({ password_hash: ha1 })
    .eq("id", accountId);

  result.success = true;
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Kamailio sync request received");

    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse and validate request
    const body = await req.json();
    const validationResult = syncRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, account_id, username, password } = validationResult.data;
    let result: SyncResult | { connected: boolean; auth_enabled: boolean; registered_users: number; message: string };

    // Execute requested action
    switch (action) {
      case "check_status":
        result = await checkKamailioStatus();
        break;

      case "sync_all":
        result = await syncAllAccounts(supabaseClient);
        break;

      case "create_account":
        if (!account_id) {
          return new Response(
            JSON.stringify({ success: false, error: "account_id required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await createSIPAccount(supabaseClient, account_id, username, password);
        break;

      case "delete_account":
        result = {
          success: false,
          action: "delete_account",
          accounts_created: 0,
          accounts_updated: 0,
          accounts_deleted: 0,
          errors: ["Delete not implemented yet"],
          warnings: [],
        };
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    console.log("✅ Sync result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
