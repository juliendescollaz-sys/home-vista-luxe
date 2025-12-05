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
 * Charge un JSON local depuis Home Assistant (fallback si Supabase ne renvoie rien)
 */
async function fetchFallbackJson(
  haBaseUrl: string,
  haToken: string,
  floorId: string
): Promise<NeoliaFloorJson | null> {
  try {
    const url = `${haBaseUrl.replace(/\/+$/, "")}/local/neolia/${floorId}.json`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${haToken}`,
      },
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
    console.warn("[Neolia] JSON fallback introuvable pour", floorId, e);
    return null;
  }
}

/**
 * Construction des assets en parlant **uniquement** à HA
 * (utilisé pour le fallback complet)
 */
async function buildAssetsFromHaOnly(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson: boolean
): Promise<NeoliaFloorAsset[]> {
  const baseUrl = haBaseUrl.replace(/\/+$/, "");
  const results: NeoliaFloorAsset[] = [];

  for (const f of floors) {
    const floorId = f.floor_id || f.id || "";
    const floorName = f.name || floorId || "Étage";

    if (!floorId) {
      continue;
    }

    const pngUrl = `${baseUrl}/local/neolia/${floorId}.png`;
    const jsonUrl = `${baseUrl}/local/neolia/${floorId}.json`;

    let pngAvailable = false;
    let jsonData: NeoliaFloorJson | null = null;

    // PNG : on teste en HEAD (ou GET si HEAD échoue)
    try {
      let response = await fetch(pngUrl, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${haToken}`,
        },
      });

      if (!response.ok && response.status === 405) {
        // Certains serveurs refusent HEAD → fallback GET
        response = await fetch(pngUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${haToken}`,
          },
        });
      }

      pngAvailable = response.ok;
    } catch (e) {
      console.warn("[Neolia] PNG introuvable pour", floorId, e);
      pngAvailable = false;
    }

    // JSON (optionnel)
    if (includeJson) {
      jsonData = await fetchFallbackJson(baseUrl, haToken, floorId);
    }

    results.push({
      floorId,
      floorName,
      pngAvailable,
      jsonAvailable: !!jsonData,
      jsonData,
    });
  }

  return results;
}

/**
 * Vérifie les assets Neolia pour tous les étages.
 *
 * Stratégie :
 * 1. Si Supabase est configuré → edge function (timeout 4s).
 * 2. Si Supabase absent / en erreur / timeout → fallback buildAssetsFromHaOnly().
 */
export async function checkAllFloorsNeoliaAssets(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson: boolean = true
): Promise<NeoliaFloorAsset[]> {
  if (!haBaseUrl || !floors || floors.length === 0) {
    console.debug("[Neolia] Paramètres manquants pour checkAllFloorsNeoliaAssets");
    return [];
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Aucun Supabase configuré → fallback direct HA
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Neolia] Supabase non configuré → fallback HA-only");
    return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
  }

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

  console.debug("[Neolia] Appel Edge Function neolia-assets:", {
    url: edgeFunctionUrl,
    floorsCount: floors.length,
  });

  const timeoutMs = 4000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[Neolia] Erreur fonction neolia-assets:",
        response.status,
        text
      );
      // Fallback HA-only
      return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.assets)) {
      console.error("[Neolia] Réponse inattendue de neolia-assets:", data);
      // Fallback HA-only
      return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
    }

    console.debug("[Neolia] Assets récupérés via Supabase:", data.assets);

    const results: NeoliaFloorAsset[] = [];

    for (const asset of data.assets) {
      const floorId: string = asset.floorId;
      const floorName: string = asset.floorName;
      const pngAvailable: boolean = !!asset.pngAvailable;

      let jsonData: NeoliaFloorJson | null = asset.jsonData || null;

      // Si on veut le JSON mais que l'edge ne l'a pas fourni → fallback HA
      if (includeJson && !jsonData) {
        console.warn("[Neolia] JSON absent via Supabase, fallback HA:", floorId);
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

    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === "AbortError") {
      console.warn(
        "[Neolia] Timeout Edge Function neolia-assets → fallback HA-only"
      );
    } else {
      console.error("[Neolia] Exception lors de l'appel Edge Function:", error);
    }

    // Fallback complet via HA
    return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
  }
}
