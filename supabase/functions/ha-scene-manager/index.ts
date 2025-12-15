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
    description?: string;
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
      
      // Build payload - icon is already prefixed with mdi: from the client
      // HA Scene Config API only accepts: id, name, entities, icon
      // Note: description is NOT supported by HA scene config API
      const payload: Record<string, any> = {
        id: sceneId,
        name: sceneConfig.name,
        entities: sceneConfig.entities,
      };
      
      // Add icon - avoid double mdi: prefix
      if (sceneConfig.icon) {
        payload.icon = sceneConfig.icon.startsWith("mdi:") 
          ? sceneConfig.icon 
          : `mdi:${sceneConfig.icon}`;
      }

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
      
      // For GET requests with 400/404 or "Resource not found", return success with notFound flag
      // HA can return 400 with "Resource not found" for scenes created via UI or YAML
      const isResourceNotFound = errorText.toLowerCase().includes("resource not found") || 
                                  errorText.toLowerCase().includes("not found");
      if (action === "get" && (response.status === 404 || (response.status === 400 && isResourceNotFound))) {
        console.log(`[ha-scene-manager] Scene config not found (status ${response.status}), returning notFound response`);
        return new Response(
          JSON.stringify({ notFound: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // For DELETE requests with 400/404, the scene is a legacy HA scene that cannot be deleted via config API
      if (action === "delete" && (response.status === 400 || response.status === 404)) {
        console.log(`[ha-scene-manager] Scene cannot be deleted (legacy scene), returning cannotDelete response`);
        return new Response(
          JSON.stringify({ cannotDelete: true, reason: "legacy_scene" }),
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
