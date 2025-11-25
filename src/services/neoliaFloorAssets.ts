// src/services/neoliaFloorAssets.ts

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  jsonAvailable: boolean;
  pngAvailable: boolean;
}

/**
 * Normalise l'URL de base de Home Assistant :
 * - supprime les / de fin
 * - supprime un éventuel suffixe /api
 *   (ex: http://host:8123/api -> http://host:8123)
 */
function normalizeBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return "";

  // On enlève les / de fin
  let url = rawBaseUrl.replace(/\/+$/, "");

  // Si ça se termine par /api, on le retire
  if (url.endsWith("/api")) {
    url = url.slice(0, -4); // retire les 4 caractères de "/api"
  }

  return url;
}

/**
 * Vérifie si une URL /local/... existe sur Home Assistant.
 * Retourne true si status === 200, false sinon (404, erreur réseau, etc.).
 */
async function checkUrlExists(url: string, token?: string): Promise<boolean> {
  try {
    const headers: HeadersInit = {};

    // /local ne nécessite normalement pas de token,
    // mais on le passe éventuellement si déjà disponible.
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    console.debug("[Neolia][checkUrlExists]", url, "->", response.status);

    if (response.status === 200) {
      return true;
    }
    if (response.status === 404) {
      return false;
    }

    console.warn("[Neolia] Statut inattendu pour", url, "status:", response.status);
    return false;
  } catch (error) {
    console.warn("[Neolia] Erreur réseau pour", url, error);
    return false;
  }
}

/**
 * Vérifie la présence du PNG et du JSON pour un étage donné.
 */
export async function checkNeoliaAssetsForFloor(
  floorId: string,
  baseUrl: string,
  token?: string,
): Promise<{ floorId: string; jsonAvailable: boolean; pngAvailable: boolean }> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  const jsonUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.json`;
  const pngUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.png`;

  console.debug("[Neolia] Vérification des assets pour", floorId, {
    baseUrl,
    normalizedBaseUrl,
    jsonUrl,
    pngUrl,
  });

  const [jsonAvailable, pngAvailable] = await Promise.all([
    checkUrlExists(jsonUrl, token),
    checkUrlExists(pngUrl, token),
  ]);

  return {
    floorId,
    jsonAvailable,
    pngAvailable,
  };
}

/**
 * Vérifie les assets Neolia pour tous les étages.
 * `floors` doit être le tableau d'étages provenant du store HA.
 */
export async function checkAllFloorsNeoliaAssets(
  floors: any[],
  baseUrl: string,
  token?: string,
): Promise<NeoliaFloorAsset[]> {
  if (!floors || floors.length === 0) {
    console.debug("[Neolia] Aucun étage fourni à checkAllFloorsNeoliaAssets");
    return [];
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  console.debug("[Neolia] checkAllFloorsNeoliaAssets baseUrl:", baseUrl);
  console.debug("[Neolia] baseUrl normalisée:", normalizedBaseUrl);

  const results = await Promise.all(
    floors.map(async (floor) => {
      const floorId: string = floor.floor_id || floor.id || floor.slug || floor.uid;
      const floorName: string = floor.name || floorId;

      if (!floorId) {
        console.warn("[Neolia] Étape sans floor_id détectée :", floor);
        return null;
      }

      const assets = await checkNeoliaAssetsForFloor(floorId, normalizedBaseUrl, token);

      const result: NeoliaFloorAsset = {
        floorId,
        floorName,
        jsonAvailable: assets.jsonAvailable,
        pngAvailable: assets.pngAvailable,
      };

      return result;
    }),
  );

  // On filtre les null éventuels
  return results.filter((r): r is NeoliaFloorAsset => r !== null);
}
