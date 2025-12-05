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
 * Charge un JSON local depuis Home Assistant si Supabase renvoie null
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

    if (!response.ok) {
      return null;
    }

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
 * Détection directe des assets en parlant uniquement à Home Assistant
 * → utilisée si Supabase n'est pas configuré ou répond trop lentement.
 * On parallélise les requêtes pour éviter de cumuler les latences par étage.
 */
async function buildAssetsFromHaOnly(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson: boolean
): Promise<NeoliaFloorAsset[]> {
  if (!haBaseUrl || !floors || floors.length === 0) {
    console.debug("[Neolia] buildAssetsFromHaOnly: paramètres incomplets");
    return [];
  }

  const baseUrl = haBaseUrl.replace(/\/+$/, "");

  const tasks = floors.map(async (floor) => {
    const floorIdFromHa = (floor as any).floor_id || (floor as any).id;
    const floorName = (floor as any).name || "Étage";

    if (!floorIdFromHa) {
      console.warn("[Neolia] Étape sans id dans buildAssetsFromHaOnly:", floor);
      return null;
    }

    const candidateIds = [String(floorIdFromHa)];

    for (const candidateId of candidateIds) {
      const pngUrl = `${baseUrl}/local/neolia/${candidateId}.png`;
      let pngAvailable = false;

      try {
        // On commence par un HEAD ; si le serveur ne le supporte pas on retombe sur un GET.
        const headRes = await fetch(pngUrl, {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${haToken}`,
          },
        });

        if (headRes.ok) {
          pngAvailable = true;
        } else if (headRes.status === 405 || headRes.status === 501) {
          const getRes = await fetch(pngUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${haToken}`,
            },
          });
          pngAvailable = getRes.ok;
        }
      } catch (err) {
        console.warn("[Neolia] buildAssetsFromHaOnly: PNG introuvable pour", candidateId, err);
        pngAvailable = false;
      }

      let jsonData: NeoliaFloorJson | null = null;
      if (includeJson) {
        jsonData = await fetchFallbackJson(baseUrl, haToken, candidateId);
      }

      if (!pngAvailable && !jsonData) {
        // Rien pour cet id, on tente éventuellement un autre candidateId
        continue;
      }

      return {
        floorId: candidateId,
        floorName,
        pngAvailable,
        jsonAvailable: !!jsonData,
        jsonData,
      } as NeoliaFloorAsset;
    }

    // Aucun asset trouvé pour cet étage
    console.debug("[Neolia] Aucun asset trouvé en direct HA pour l'étage", floorName);
    return null;
  });

  const assets = await Promise.all(tasks);
  return assets.filter((a): a is NeoliaFloorAsset => a !== null);
}

/**
 * Vérifie les assets Neolia pour tous les étages via l'Edge Function Supabase.
 * Si Supabase est indisponible ou trop lent, on bascule sur un fallback direct HA.
 */
export async function checkAllFloorsNeoliaAssets(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson = true
): Promise<NeoliaFloorAsset[]> {
  if (!haBaseUrl || !floors || floors.length === 0) {
    console.debug("[Neolia] Paramètres manquants pour checkAllFloorsNeoliaAssets");
    return [];
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const hasSupabase = !!supabaseUrl && !!supabaseKey;

  // Si Supabase n'est pas configuré, on passe directement par Home Assistant
  if (!hasSupabase) {
    console.warn("[Neolia] Supabase non configuré, utilisation du fallback direct HA");
    return buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/neolia-assets`;
  const payload = {
    haBaseUrl,
    haToken,
    includeJson,
    floors: floors.map((f) => ({
      id: (f as any).floor_id || (f as any).id || "",
      name: (f as any).name,
    })),
  };

  console.debug("[Neolia] Appel Edge Function:", {
    url: edgeFunctionUrl,
    floorsCount: floors.length,
  });

  // Timeout agressif pour ne pas bloquer l'UI
  const timeoutMs = 4000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      console.error("[Neolia] Erreur fonction neolia-assets:", response.status, text);
      throw new Error(
        `Edge function neolia-assets failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.assets)) {
      console.error("[Neolia] Réponse inattendue de neolia-assets:", data);
      return [];
    }

    console.debug("[Neolia] Assets récupérés via Supabase:", data.assets);

    // Si Supabase n'a rien pour nous, on tente le fallback HA
    if (!data.assets || data.assets.length === 0) {
      console.warn("[Neolia] Edge function neolia-assets ne retourne aucun asset, fallback direct HA");
      return buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
    }

    const results: NeoliaFloorAsset[] = [];

    for (const asset of data.assets) {
      let jsonData: NeoliaFloorJson | null = asset.jsonData || null;

      // Fallback JSON si Supabase n'a pas le fichier mais qu'on souhaite le JSON
      if (includeJson && !jsonData && asset.floorId) {
        console.warn("[Neolia] JSON absent via Supabase, fallback HA pour", asset.floorId);
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
  } catch (error: any) {
    // Timeout ou erreur réseau / CORS de Supabase → fallback local
    if (error?.name === "AbortError") {
      console.warn("[Neolia] Edge function neolia-assets timeout, fallback direct HA");
    } else {
      console.error("[Neolia] Exception lors de l'appel Edge Function:", error);
    }

    return buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
  }
}
