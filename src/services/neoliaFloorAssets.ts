// src/services/neoliaFloorAssets.ts

export interface NeoliaFloorPolygon {
  area_id: string;
  relative: [number, number][];
}

export interface NeoliaFloorArea {
  area_id: string;
  name: string;
}

export interface NeoliaFloorJson {
  floor_id: string;
  areas?: NeoliaFloorArea[];
  polygons: NeoliaFloorPolygon[];
}

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  pngAvailable: boolean;
  jsonAvailable: boolean;
  jsonData?: NeoliaFloorJson | null;
}

// Type minimal pour les étages venant du store HA
type FloorLike = {
  floor_id?: string;
  id?: string;
  name: string;
};

/**
 * Retourne true si l'URL HA semble locale (Panel / LAN)
 * On considère :
 *  - http://192.168.x.x
 *  - http://10.x.x.x
 *  - http://172.16–31.x.x
 *  - http://homeassistant.local
 *  - http://localhost / 127.0.0.1
 */
function isLocalHaUrl(haBaseUrl: string): boolean {
  try {
    const url = new URL(haBaseUrl);
    if (url.protocol !== "http:") return false;

    const host = url.hostname;

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      host === "homeassistant.local"
    ) {
      return true;
    }

    // 10.0.0.0/8
    if (host.startsWith("10.")) return true;

    // 192.168.0.0/16
    if (host.startsWith("192.168.")) return true;

    // 172.16.0.0/12
    const m = /^172\.(\d+)\./.exec(host);
    if (m) {
      const n = Number(m[1]);
      if (n >= 16 && n <= 31) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * fetch avec timeout (GET/HEAD) pour éviter de bloquer 1–2 minutes
 */
async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 4000, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Vérifie rapidement si un PNG existe côté HA
 */
async function checkPngExists(
  haBaseUrl: string,
  haToken: string,
  floorId: string
): Promise<boolean> {
  const base = haBaseUrl.replace(/\/+$/, "");
  const url = `${base}/local/neolia/${floorId}.png`;

  try {
    const res = await fetchWithTimeout(url, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${haToken}`,
      },
      timeoutMs: 4000,
    });

    if (res.ok) return true;

    // Certains serveurs n'aiment pas HEAD → on essaie un petit GET
    if (res.status === 405) {
      const resGet = await fetchWithTimeout(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${haToken}`,
        },
        timeoutMs: 4000,
      });
      return resGet.ok;
    }

    return false;
  } catch (e) {
    console.warn("[Neolia] checkPngExists échec pour", floorId, e);
    return false;
  }
}

/**
 * Charge un JSON local depuis Home Assistant (fallback direct)
 */
async function fetchFallbackJson(
  haBaseUrl: string,
  haToken: string,
  floorId: string
): Promise<NeoliaFloorJson | null> {
  try {
    const base = haBaseUrl.replace(/\/+$/, "");
    const url = `${base}/local/neolia/${floorId}.json`;

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${haToken}`,
      },
      timeoutMs: 5000,
    });

    if (!response.ok) return null;

    const raw = await response.json();
    return {
      floor_id: raw.floor_id,
      areas: (raw.areas || []).map((a: any) => ({
        area_id: a.area_id,
        name: a.name,
      })),
      polygons: (raw.polygons || []).map((p: any) => ({
        area_id: p.area_id,
        relative: p.relative,
      })),
    };
  } catch (e) {
    console.warn("[Neolia] JSON local introuvable pour", floorId, e);
    return null;
  }
}

/**
 * Mode 1 : PANEL / URL locale → on ne passe JAMAIS par Supabase.
 * On interroge directement Home Assistant (/local/neolia/*) avec des timeouts courts.
 */
async function checkAllFloorsNeoliaAssetsLocal(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson = true
): Promise<NeoliaFloorAsset[]> {
  const results: NeoliaFloorAsset[] = [];

  for (const f of floors) {
    const floorId = f.floor_id || f.id || "";
    const floorName = f.name || floorId || "Étage";

    if (!floorId) continue;

    // PNG
    const pngAvailable = await checkPngExists(haBaseUrl, haToken, floorId);

    // JSON (optionnel)
    let jsonData: NeoliaFloorJson | null = null;
    if (includeJson) {
      jsonData = await fetchFallbackJson(haBaseUrl, haToken, floorId);
    }

    results.push({
      floorId,
      floorName,
      pngAvailable,
      jsonAvailable: !!jsonData,
      jsonData,
    });
  }

  console.debug("[Neolia] Assets locaux (Panel/LAN):", results);
  return results;
}

/**
 * Mode 2 : PWA / Tablet / URL cloud → on interroge l'Edge Function Supabase,
 * avec fallback JSON local si nécessaire.
 */
async function checkAllFloorsNeoliaAssetsViaSupabase(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson = true
): Promise<NeoliaFloorAsset[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/neolia-assets`;

  const payload = {
    haBaseUrl,
    haToken,
    includeJson,
    floors: floors.map((f) => ({
      id: f.floor_id || f.id || "",
      name: f.name,
    })),
  };

  console.debug("[Neolia] Appel Edge Function:", {
    url: edgeFunctionUrl,
    floorsCount: floors.length,
  });

  try {
    // Timeout global pour éviter les 60–120s d'attente si HA est injoignable
    const response = await fetchWithTimeout(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
      timeoutMs: 8000,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[Neolia] Erreur fonction neolia-assets:",
        response.status,
        text
      );
      return [];
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.assets)) {
      console.error("[Neolia] Réponse inattendue de neolia-assets:", data);
      return [];
    }

    console.debug("[Neolia] Assets récupérés via Supabase:", data.assets);

    const results: NeoliaFloorAsset[] = [];

    for (const asset of data.assets) {
      let jsonData: NeoliaFloorJson | null = asset.jsonData || null;

      // Fallback JSON local si Supabase ne renvoie rien
      if (includeJson && !jsonData) {
        console.warn(
          "[Neolia] JSON absent via Supabase, fallback HA:",
          asset.floorId
        );
        jsonData = await fetchFallbackJson(haBaseUrl, haToken, asset.floorId);
      }

      results.push({
        floorId: asset.floorId,
        floorName: asset.floorName,
        pngAvailable: asset.pngAvailable,
        jsonAvailable: !!jsonData,
        jsonData,
      });
    }

    return results;
  } catch (error) {
    console.error(
      "[Neolia] Exception lors de l'appel Edge Function:",
      error
    );
    return [];
  }
}

/**
 * Vérifie les assets Neolia pour tous les étages.
 * - PANEL / URL locale → HTTP direct vers HA (rapide, pas de Supabase)
 * - PWA / URL cloud → Supabase + fallback JSON local
 */
export async function checkAllFloorsNeoliaAssets(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson = true
): Promise<NeoliaFloorAsset[]> {
  if (!haBaseUrl || !floors || floors.length === 0) {
    console.debug(
      "[Neolia] Paramètres manquants pour checkAllFloorsNeoliaAssets"
    );
    return [];
  }

  const local = isLocalHaUrl(haBaseUrl);
  console.debug("[Neolia] Détection mode assets:", {
    haBaseUrl,
    local,
  });

  if (local) {
    // 👉 PANEL / LAN : direct HA, pas de Supabase
    return checkAllFloorsNeoliaAssetsLocal(
      floors,
      haBaseUrl,
      haToken,
      includeJson
    );
  }

  // 👉 PWA / cloud : Supabase + fallback
  return checkAllFloorsNeoliaAssetsViaSupabase(
    floors,
    haBaseUrl,
    haToken,
    includeJson
  );
}
