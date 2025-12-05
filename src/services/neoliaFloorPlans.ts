// Service de préchargement des plans Neolia
import { checkAllFloorsNeoliaAssets, type NeoliaFloorAsset } from "./neoliaFloorAssets";
import type { HAConnection, HAFloor } from "@/types/homeassistant";

export type NeoliaPlanPolygon = {
  areaId: string;
  relative: [number, number][];
};

export type NeoliaPlanArea = {
  areaId: string;
  name: string;
};

export type NeoliaPlanJson = {
  floorId: string;
  areas: NeoliaPlanArea[];
  polygons: NeoliaPlanPolygon[];
};

export type NeoliaFloorPlan = {
  floorId: string;
  floorName: string;
  hasPng: boolean;
  hasJson: boolean;
  imageUrl?: string;
  json?: NeoliaPlanJson;
};

/**
 * Précharge une image en arrière-plan
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Charge tous les plans Neolia disponibles
 * ⚠️ Optimisé : ne bloque plus sur le préchargement des images.
 */
export async function loadNeoliaFloorPlans(
  connection: HAConnection,
  floors: HAFloor[]
): Promise<NeoliaFloorPlan[]> {
  if (!connection || !floors || floors.length === 0) {
    console.debug("[Neolia Plans] Pas de connexion ou d'étages disponibles");
    return [];
  }

  console.log("[Neolia Plans] Chargement des plans pour", floors.length, "étages");

  try {
    // Récupérer les assets depuis l'Edge Function
    const assets = await checkAllFloorsNeoliaAssets(
      floors,
      connection.url,
      connection.token,
      true, // includeJson
    );

    console.debug("[Neolia Plans] Assets récupérés:", assets);

    const plans: NeoliaFloorPlan[] = [];
    const preloadPromises: Promise<void>[] = [];

    for (const asset of assets) {
      const plan: NeoliaFloorPlan = {
        floorId: asset.floorId,
        floorName: asset.floorName,
        hasPng: asset.pngAvailable,
        hasJson: asset.jsonAvailable,
      };

      // Générer l'URL de l'image si disponible
      if (asset.pngAvailable) {
        plan.imageUrl = `${connection.url.replace(/\/+$/, "")}/local/neolia/${asset.floorId}.png`;

        // Précharger en ARRIÈRE-PLAN (sans bloquer le retour de la fonction)
        preloadPromises.push(
          preloadImage(plan.imageUrl).catch((err) => {
            console.warn(`[Neolia Plans] Échec du préchargement de l'image pour ${asset.floorId}:`, err);
          }),
        );
      }

      // Convertir le JSON au format interne
      console.log("JSON_DATA:", asset.floorId, asset.jsonData);
      if (asset.jsonAvailable && asset.jsonData) {
        plan.json = {
          floorId: asset.jsonData.floor_id,
          areas: (asset.jsonData.areas || []).map((a) => ({
            areaId: a.area_id,
            name: a.name,
          })),
          polygons: (asset.jsonData.polygons || []).map((p) => ({
            areaId: p.area_id,
            relative: p.relative,
          })),
        };
      }

      plans.push(plan);
    }

    // Lancer le préchargement en tâche de fond, SANS await
    if (preloadPromises.length > 0) {
      Promise.allSettled(preloadPromises)
        .then(() => {
          console.log("[Neolia Plans] Préchargement terminé pour", plans.length, "plans");
        })
        .catch((err) => {
          console.warn("[Neolia Plans] Erreur inattendue pendant le préchargement:", err);
        });
    }

    // ➜ On retourne les plans tout de suite, l'UI peut s'afficher
    return plans;
  } catch (error) {
    console.error("[Neolia Plans] Erreur lors du chargement des plans:", error);
    return [];
  }
}
