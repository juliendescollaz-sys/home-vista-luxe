// src/services/neoliaFloorAssets.ts

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  jsonAvailable: boolean;
  pngAvailable: boolean;
}

interface RawNeoliaAsset {
  floor_id: string;
  png: boolean;
  json: boolean;
}

/**
 * Construit l'URL de base de l'API HA :
 * - enlève les / de fin
 * - ajoute /api si nécessaire
 */
function buildApiBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return "";
  let url = rawBaseUrl.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url += "/api";
  }
  return url;
}

/**
 * Récupère la liste des assets Neolia exposés par Home Assistant
 * via /api/neolia/assets.
 */
async function fetchNeoliaAssetsFromHA(
  baseUrl: string,
  token: string,
): Promise<Record<string, { png: boolean; json: boolean }>> {
  const apiBase = buildApiBaseUrl(baseUrl);
  const url = `${apiBase}/neolia/assets`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  console.debug("[Neolia] Appel /api/neolia/assets :", url);

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    console.warn("[Neolia] /api/neolia/assets a retourné un statut non OK :", response.status);
    return {};
  }

  const data = (await response.json()) as {
    status?: string;
    assets?: RawNeoliaAsset[];
  };

  if (data.status !== "ok" || !Array.isArray(data.assets)) {
    console.warn("[Neolia] Réponse inattendue de /api/neolia/assets :", data);
    return {};
  }

  const map: Record<string, { png: boolean; json: boolean }> = {};

  for (const asset of data.assets) {
    if (!asset.floor_id) continue;
    map[asset.floor_id] = {
      png: !!asset.png,
      json: !!asset.json,
    };
  }

  console.debug("[Neolia] Assets reçus depuis HA :", map);
  return map;
}

/**
 * Fonction utilisée par la page Maison pour afficher l'état
 * des PNG/JSON par étage.
 */
export async function checkAllFloorsNeoliaAssets(
  floors: any[],
  baseUrl: string,
  token: string,
): Promise<NeoliaFloorAsset[]> {
  if (!floors || floors.length === 0) {
    console.debug("[Neolia] Aucun étage fourni à checkAllFloorsNeoliaAssets");
    return [];
  }

  const assetsMap = await fetchNeoliaAssetsFromHA(baseUrl, token);

  return floors.map((floor) => {
    const floorId: string = floor.floor_id || floor.id || floor.slug || floor.uid;
    const floorName: string = floor.name || floorId;

    const fromMap = floorId ? assetsMap[floorId] : undefined;

    return {
      floorId,
      floorName,
      jsonAvailable: !!fromMap?.json,
      pngAvailable: !!fromMap?.png,
    };
  });
}
