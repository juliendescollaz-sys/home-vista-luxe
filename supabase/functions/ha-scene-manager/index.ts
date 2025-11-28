import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

interface SceneRequest {
  haBaseUrl: string;
  haToken: string;
  action: "create" | "update" | "delete" | "get";
  sceneId: string;
  sceneConfig?: {
    name: string;
    entities: Record<string, any>;
    icon?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SceneRequest = await req.json();
    const { haBaseUrl, haToken, action, sceneId, sceneConfig } = body;

    if (!haBaseUrl || !haToken || !action || !sceneId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: haBaseUrl, haToken, action, sceneId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = haBaseUrl.replace(/\/+$/, "");
    const endpoint = `${apiUrl}/api/config/scene/config/${sceneId}`;

    let response: Response;

    if (action === "get") {
      // Get scene configuration
      console.log(`[ha-scene-manager] GET scene config: ${sceneId}`);
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${haToken}`,
        },
      });
    } else if (action === "delete") {
      console.log(`[ha-scene-manager] DELETE scene: ${sceneId}`);
      response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${haToken}`,
        },
      });
    } else {
      // create or update
      if (!sceneConfig) {
        return new Response(
          JSON.stringify({ error: "sceneConfig is required for create/update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[ha-scene-manager] ${action.toUpperCase()} scene: ${sceneId}`);
      
      const payload = {
        id: sceneId,
        name: sceneConfig.name,
        entities: sceneConfig.entities,
        ...(sceneConfig.icon && { icon: `mdi:${sceneConfig.icon.toLowerCase()}` }),
      };

      response = await fetch(endpoint, {
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
      console.error(`[ha-scene-manager] HA API error: ${response.status} - ${errorText}`);
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

    console.log(`[ha-scene-manager] Success: ${action} ${sceneId}`);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[ha-scene-manager] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
