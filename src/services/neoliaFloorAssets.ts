// src/services/neoliaFloorAssets.ts

export interface NeoliaFloorPolygon {
  area_id: string;
  relative: [number, number][];
}

export interface NeoliaFloorJson {
  floor_id: string;
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
 * Vérifie les assets Neolia pour tous les étages via l'Edge Function Supabase.
 * `floors` doit être le tableau d'étages provenant du store HA.
 * Si `includeJson` est true, récupère aussi le contenu JSON des plans.
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

  // Construire l'URL complète de l'Edge Function
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
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[Neolia] Erreur fonction neolia-assets:",
        response.status,
        text
      );
      throw new Error(
        `Edge function neolia-assets failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.assets)) {
      console.error("[Neolia] Réponse inattendue de neolia-assets:", data);
      return [];
    }

    console.debug("[Neolia] Assets récupérés avec succès:", data.assets);
    return data.assets as NeoliaFloorAsset[];
  } catch (error) {
    console.error("[Neolia] Exception lors de l'appel Edge Function:", error);
    return [];
  }
}

