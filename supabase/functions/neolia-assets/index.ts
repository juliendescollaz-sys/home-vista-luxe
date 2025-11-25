import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type FloorInput = {
  id: string;
  name?: string;
};

type NeoliaFloorAsset = {
  floorId: string;
  floorName: string;
  pngAvailable: boolean;
  jsonAvailable: boolean;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function checkUrl(url: string, token?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    return res.ok;
  } catch (_e) {
    // En cas d'erreur réseau, on considère que le fichier n'est pas dispo
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Préflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST is allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  const { haBaseUrl, haToken, floors } = body ?? {};

  if (!haBaseUrl || !Array.isArray(floors)) {
    return new Response(
      JSON.stringify({
        error: "Missing 'haBaseUrl' or 'floors' in body",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  const normalizedBaseUrl: string = String(haBaseUrl).replace(/\/$/, "");
  const floorsInput: FloorInput[] = floors;

  const assets: NeoliaFloorAsset[] = [];

  for (const floor of floorsInput) {
    const floorId = floor.id;
    const floorName = floor.name ?? floorId;

    const pngUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.png`;
    const jsonUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.json`;

    const [pngAvailable, jsonAvailable] = await Promise.all([
      checkUrl(pngUrl, haToken),
      checkUrl(jsonUrl, haToken),
    ]);

    assets.push({
      floorId,
      floorName,
      pngAvailable,
      jsonAvailable,
    });
  }

  return new Response(
    JSON.stringify({ assets }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
});
