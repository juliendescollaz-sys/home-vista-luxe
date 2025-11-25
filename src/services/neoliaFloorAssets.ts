// src/services/neoliaFloorAssets.ts

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  jsonAvailable: boolean;
  pngAvailable: boolean;
}

/**
 * Vérifie si une URL /local/... existe sur Home Assistant.
 * Retourne true si status === 200, false sinon (404, erreur réseau, etc.).
 */
async function checkUrlExists(url: string, token?: string): Promise<boolean> {
  try {
    const headers: HeadersInit = {};

    // Le /local ne nécessite normalement pas de token,
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
  // On nettoie la base URL pour éviter les doubles //
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");

  const jsonUrl = `${trimmedBaseUrl}/local/neolia/${floorId}.json`;
  const pngUrl = `${trimmedBaseUrl}/local/neolia/${floorId}.png`;

  console.debug("[Neolia] Vérification des assets pour", floorId, {
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

  const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");

  const results = await Promise.all(
    floors.map(async (floor) => {
      const floorId: string = floor.floor_id || floor.id || floor.slug || floor.uid;
      const floorName: string = floor.name || floorId;

      if (!floorId) {
        console.warn("[Neolia] Étape sans floor_id détectée :", floor);
        return null;
      }

      const assets = await checkNeoliaAssetsForFloor(floorId, trimmedBaseUrl, token);

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
