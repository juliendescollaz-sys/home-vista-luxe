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

// --------------------------------------------------------
// CHECK URL AVEC TOKEN OBLIGATOIRE
// --------------------------------------------------------
async function checkUrl(url: string, token?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    return res.ok;
  } catch (_e) {
    return false;
  }
}

// --------------------------------------------------------
// MAIN FUNCTION
// --------------------------------------------------------
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { haBaseUrl, haToken, floors, includeJson } = body ?? {};

  if (!haBaseUrl || !Array.isArray(floors)) {
    return new Response(
      JSON.stringify({
        error: "Missing 'haBaseUrl' or 'floors' in body",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const base = haBaseUrl.replace(/\/$/, "");
  const floorsInput: FloorInput[] = floors;
  const assets: NeoliaFloorAsset[] = [];

  for (const floor of floorsInput) {
    const floorId = floor.id;
    const floorName = floor.name ?? floorId;

    const pngUrl = `${base}/local/neolia/${floorId}.png`;
    const jsonUrl = `${base}/local/neolia/${floorId}.json`;

    const [pngAvailable, jsonAvailable] = await Promise.all([checkUrl(pngUrl, haToken), checkUrl(jsonUrl, haToken)]);

    let jsonData: NeoliaFloorJson | null = null;

    if (includeJson && jsonAvailable) {
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
        };

        if (haToken) {
          headers["Authorization"] = `Bearer ${haToken}`;
        }

        const jsonRes = await fetch(jsonUrl, {
          method: "GET",
          headers,
        });

        if (jsonRes.ok) {
          jsonData = await jsonRes.json();
        } else {
          console.error(`[Neolia] JSON fetch error for ${floorId}:`, jsonRes.status);
        }
      } catch (err) {
        console.error(`[Neolia] Exception while fetching JSON for ${floorId}:`, err);
      }
    }

    assets.push({
      floorId,
      floorName,
      pngAvailable,
      jsonAvailable,
      jsonData,
    });
  }

  return new Response(JSON.stringify({ assets }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
