import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

interface AutomationRequest {
  haBaseUrl: string;
  haToken: string;
  action: "create" | "update" | "delete" | "get";
  automationId: string;
  automationConfig?: {
    alias: string;
    description?: string;
    trigger: any[];
    action: any[];
    condition?: any[];
    icon?: string;
    mode?: string;
  };
}

// Helper function with retry logic for transient network errors
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 500
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      const isTransientError = error instanceof Error && (
        error.message.includes("tls handshake") ||
        error.message.includes("connection") ||
        error.message.includes("network") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ETIMEDOUT")
      );
      
      if (isTransientError && attempt < retries) {
        console.log(`[ha-automation-manager] Attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AutomationRequest = await req.json();
    const { haBaseUrl, haToken, action, automationId, automationConfig } = body;

    console.log(`[ha-automation-manager] Request: action=${action}, automationId=${automationId}`);

    if (!haBaseUrl || !haToken || !action || !automationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: haBaseUrl, haToken, action, automationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = haBaseUrl.replace(/\/+$/, "");
    const endpoint = `${apiUrl}/api/config/automation/config/${automationId}`;

    let response: Response;

    if (action === "get") {
      console.log(`[ha-automation-manager] GET automation config: ${automationId}`);
      response = await fetchWithRetry(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${haToken}`,
        },
      });
    } else if (action === "delete") {
      console.log(`[ha-automation-manager] DELETE automation: ${automationId}`);
      response = await fetchWithRetry(endpoint, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${haToken}`,
        },
      });
    } else {
      // create or update
      if (!automationConfig) {
        return new Response(
          JSON.stringify({ error: "automationConfig is required for create/update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[ha-automation-manager] ${action.toUpperCase()} automation: ${automationId}`);
      
      // Build payload
      const payload: Record<string, any> = {
        id: automationId,
        alias: automationConfig.alias,
        trigger: automationConfig.trigger,
        action: automationConfig.action,
        mode: automationConfig.mode || "single",
      };
      
      // Add optional fields
      if (automationConfig.description) {
        payload.description = automationConfig.description;
      }
      
      if (automationConfig.condition && automationConfig.condition.length > 0) {
        payload.condition = automationConfig.condition;
      }

      // Note: HA automation config API does NOT support 'icon' field
      // Icons are stored locally only and synced via localStorage

      console.log(`[ha-automation-manager] Payload:`, JSON.stringify(payload));

      response = await fetchWithRetry(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${haToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ha-automation-manager] HA API error: ${response.status} - ${errorText}`);
      
      // For GET requests with 400/404, return success with notFound flag
      const isResourceNotFound = errorText.toLowerCase().includes("resource not found") || 
                                  errorText.toLowerCase().includes("not found");
      if (action === "get" && (response.status === 404 || (response.status === 400 && isResourceNotFound))) {
        console.log(`[ha-automation-manager] Automation config not found (status ${response.status})`);
        return new Response(
          JSON.stringify({ notFound: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // For DELETE requests with 400/404, the automation is a legacy HA automation
      if (action === "delete" && (response.status === 400 || response.status === 404)) {
        console.log(`[ha-automation-manager] Automation cannot be deleted (legacy automation)`);
        return new Response(
          JSON.stringify({ cannotDelete: true, reason: "legacy_automation" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Home Assistant API error: ${response.status}`,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For successful responses, try to parse JSON or return empty success
    let result = {};
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        result = await response.json();
      } catch {
        result = { success: true };
      }
    } else {
      result = { success: true };
    }

    console.log(`[ha-automation-manager] Success: ${action} ${automationId}`);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[ha-automation-manager] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
