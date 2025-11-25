import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type FloorInput = {
  id: string;
  name?: string;
};

type NeoliaFloorPolygon = {
  area_id: string;
  relative: [number, number][];
};

type NeoliaFloorArea = {
  area_id: string;
  name: string;
};

type NeoliaFloorJson = {
  floor_id: string;
  areas?: NeoliaFloorArea[];
  polygons: NeoliaFloorPolygon[];
};

type NeoliaFloorAsset = {
  floorId: string;
  floorName: string;
  pngAvailable: boolean;
  jsonAvailable: boolean;
  jsonData?: NeoliaFloorJson | null;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// =========================
// Utilitaire : appel sécurisé API Home Assistant
// =========================
async function haFetch(url: string, token: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

// =========================
// Nouveau chemin API HA (accès aux fichiers /local)
// =========================
function toApiLocal(baseUrl: string, file: string): string {
  const clean = baseUrl.replace(/\/$/, "");
  return `${clean}/api/hassio/app/entrypoint/local/neolia/${file}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { haBaseUrl, haToken, floors, includeJson } = body ?? {};
  if (!haBaseUrl || !Array.isArray(floors)) {
    return new Response(JSON.stringify({ error: "Missing haBaseUrl or floors" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const assets: NeoliaFloorAsset[] = [];

  for (const floor of floors) {
    const floorId = floor.id;
    const floorName = floor.name ?? floorId;

    const pngApiUrl = toApiLocal(haBaseUrl, `${floorId}.png`);
    const jsonApiUrl = toApiLocal(haBaseUrl, `${floorId}.json`);

    const pngRes = await haFetch(pngApiUrl, haToken);
    const jsonRes = includeJson ? await haFetch(jsonApiUrl, haToken) : null;

    let jsonData: NeoliaFloorJson | null = null;
    if (jsonRes) {
      try {
        jsonData = await jsonRes.json();
      } catch (e) {
        console.error("[Neolia] JSON parse error:", e);
      }
    }

    assets.push({
      floorId,
      floorName,
      pngAvailable: !!pngRes,
      jsonAvailable: !!jsonRes,
      jsonData,
    });
  }

  return new Response(JSON.stringify({ assets }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
