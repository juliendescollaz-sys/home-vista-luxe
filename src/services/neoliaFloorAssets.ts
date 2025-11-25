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
 *  - supprime les / de fin
 *  - ajoute /api si nécessaire
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
 * Vérifie si l'origine courante est la même que celle de Home Assistant.
 * Si oui, on peut appeler directement HA (panel ou iFrame intégré).
 * Si non, on doit passer par le proxy Next.js pour éviter le CORS.
 */
function isSameOriginAsHA(rawBaseUrl: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const apiBase = buildApiBaseUrl(rawBaseUrl);
    const haUrl = new URL(apiBase);
    const here = new URL(window.location.origin);

    return haUrl.protocol === here.protocol && haUrl.host === here.host;
  } catch {
    return false;
  }
}

/**
 * Récupère la liste des assets Neolia exposés par Home Assistant
 * via /api/neolia/assets.
 *
 * - Si l'app tourne DANS HA (même origine) → appel direct à HA
 * - Si l'app tourne sur lovable.app → appel à /api/neolia/assets-proxy
 */
async function fetchNeoliaAssetsFromHA(
  baseUrl: string,
  token: string,
): Promise<Record<string, { png: boolean; json: boolean }>> {
  if (!baseUrl || !token) {
    console.warn("[Neolia] URL ou token manquant pour fetchNeoliaAssetsFromHA");
    return {};
  }

  const apiBase = buildApiBaseUrl(baseUrl);
  const haEndpoint = `${apiBase}/neolia/assets`;

  let response: Response;

  if (isSameOriginAsHA(baseUrl)) {
    // ✅ Cas panel HA : on peut attaquer HA directement
    console.debug("[Neolia] Appel direct HA /api/neolia/assets :", haEndpoint);
    response = await fetch(haEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } else {
    // ✅ Cas lovable.app : on passe par le proxy Next.js
    console.debug("[Neolia] Appel proxy /api/neolia/assets-proxy pour éviter le CORS");
    response = await fetch("/api/neolia/assets-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        baseUrl,
        token,
      }),
    });
  }

  if (!response.ok) {
    console.warn("[Neolia] Réponse non OK pour les assets Neolia :", response.status);
    return {};
  }

  const data = (await response.json()) as {
    status?: string;
    assets?: RawNeoliaAsset[];
  };

  if (data.status !== "ok" || !Array.isArray(data.assets)) {
    console.warn("[Neolia] Réponse inattendue pour les assets Neolia :", data);
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

  console.debug("[Neolia] Assets Neolia mappés :", map);
  return map;
}

/**
 * Vérifie les assets Neolia pour tous les étages.
 * `floors` doit être le tableau d'étages provenant du store HA.
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
    // ⚠️ IMPORTANT : le client HA expose généralement "id"
    const floorId: string = floor.id || floor.floor_id || floor.slug || floor.uid;

    const floorName: string = floor.name || floorId;

    const fromMap = floorId ? assetsMap[floorId] : undefined;

    const result: NeoliaFloorAsset = {
      floorId,
      floorName,
      jsonAvailable: !!fromMap?.json,
      pngAvailable: !!fromMap?.png,
    };

    return result;
  });
}
