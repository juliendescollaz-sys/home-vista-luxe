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
 * Slug basique pour transformer le nom de l'étage en nom de fichier
 * ex: "Étage" -> "etage", "Rez-de-chaussée" -> "rez_de_chaussee"
 */
function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")     // espaces / caractères spéciaux -> _
    .replace(/^_+|_+$/g, "");        // trim
}

/**
 * Charge un JSON local depuis Home Assistant pour un floorId donné
 */
async function fetchFallbackJson(
  haBaseUrl: string,
  haToken: string,
  floorId: string
): Promise<NeoliaFloorJson | null> {
  try {
    const url = `${haBaseUrl}/local/neolia/${floorId}.json`;

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
    console.warn("[Neolia] JSON fallback introuvable pour", floorId);
    return null;
  }
}

/**
 * Fallback complet basé uniquement sur Home Assistant (sans Supabase).
 * On essaie de détecter les PNG et JSON dans /local/neolia
 * en testant à la fois floor_id HA et un slug du nom de l'étage.
 */
async function buildAssetsFromHaOnly(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson: boolean,
): Promise<NeoliaFloorAsset[]> {
  const results: NeoliaFloorAsset[] = [];

  for (const f of floors) {
    const floorIdFromHa = f.floor_id || f.id || "";
    const slugName = toSlug(f.name || "");

    // Liste des candidats de nom de fichier à tester
    const candidates = Array.from(
      new Set(
        [floorIdFromHa, slugName].filter((v) => typeof v === "string" && v.length > 0),
      ),
    );

    if (candidates.length === 0) {
      console.warn("[Neolia] Aucun identifiant exploitable pour l'étage:", f);
      continue;
    }

    console.debug("[Neolia] Fallback HA-only pour étage:", {
      floorIdFromHa,
      name: f.name,
      candidates,
    });

    let pngAvailable = false;
    let jsonData: NeoliaFloorJson | null = null;
    let chosenId = candidates[0];

    // --- Détection PNG ---
    for (const candidate of candidates) {
      try {
        const pngUrl = `${haBaseUrl}/local/neolia/${candidate}.png`;
        const resp = await fetch(pngUrl, {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${haToken}`,
          },
        });
        if (resp.ok) {
          pngAvailable = true;
          chosenId = candidate;
          console.info("[Neolia] PNG détecté (fallback HA) pour", candidate);
          break;
        }
      } catch (e) {
        console.warn("[Neolia] Erreur check PNG fallback HA pour", candidate, e);
      }
    }

    // --- Détection JSON ---
    if (includeJson) {
      for (const candidate of candidates) {
        const json = await fetchFallbackJson(haBaseUrl, haToken, candidate);
        if (json) {
          jsonData = json;
          chosenId = candidate;
          console.info("[Neolia] JSON détecté (fallback HA) pour", candidate);
          break;
        }
      }
    }

    results.push({
      floorId: chosenId,
      floorName: f.name,
      pngAvailable,
      jsonAvailable: !!jsonData,
      jsonData,
    });
  }

  console.info("[Neolia] Fallback HA-only terminé. Assets trouvés:", results);
  return results;
}

/**
 * Vérifie les assets Neolia pour tous les étages via l'Edge Function Supabase,
 * avec timeout court et fallback complet vers Home Assistant si nécessaire.
 */
export async function checkAllFloorsNeoliaAssets(
  floors: FloorLike[],
  haBaseUrl: string,
  haToken: string,
  includeJson = true,
): Promise<NeoliaFloorAsset[]> {
  if (!haBaseUrl || !floors || floors.length === 0) {
    console.debug("[Neolia] Paramètres manquants pour checkAllFloorsNeoliaAssets");
    return [];
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.warn("[Neolia] VITE_SUPABASE_URL non défini, fallback direct HA-only");
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

  console.debug("[Neolia] Appel Edge Function:", {
    url: edgeFunctionUrl,
    floorsCount: floors.length,
  });

  // Timeout explicite pour éviter d'attendre 2 minutes en cas de réseau impossible
  const timeoutMs = 4000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[Neolia] Erreur fonction neolia-assets:", response.status, text);
      // Fallback complet via HA
      return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.assets)) {
      console.error("[Neolia] Réponse inattendue de neolia-assets:", data);
      // Fallback complet via HA
      return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
    }

    console.debug("[Neolia] Assets récupérés via Supabase:", data.assets);

    const results: NeoliaFloorAsset[] = [];

    for (const asset of data.assets) {
      let jsonData = asset.jsonData || null;

      // ---- Fallback si Supabase renvoie null pour le JSON ----
      if (includeJson && !jsonData) {
        console.warn("[Neolia] JSON absent via Supabase, fallback HA:", asset.floorId);
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

    // Si Supabase a répondu mais qu'on n'a rien d'exploitable, on tente quand même HA-only
    if (results.length === 0) {
      console.warn("[Neolia] Aucun asset exploitable via Supabase, fallback HA-only");
      return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
    }

    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      console.warn("[Neolia] Timeout Edge Function neolia-assets → fallback HA-only");
    } else {
      console.error("[Neolia] Exception lors de l'appel Edge Function:", error);
    }
    // Fallback complet via HA
    return await buildAssetsFromHaOnly(floors, haBaseUrl, haToken, includeJson);
  }
}
