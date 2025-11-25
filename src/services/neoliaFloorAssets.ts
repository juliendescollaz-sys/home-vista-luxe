// src/services/neoliaFloorAssets.ts
import { supabase } from "@/integrations/supabase/client";

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  jsonAvailable: boolean;
  pngAvailable: boolean;
}

/**
 * Normalise l'URL de base HA en retirant les trailing slashes
 * et en gérant les URLs WebSocket
 */
function normalizeBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return "";
  
  let url = rawBaseUrl;
  
  // Si c'est une URL WebSocket, la convertir en HTTP
  if (url.startsWith("ws://")) {
    url = url.replace("ws://", "http://");
  } else if (url.startsWith("wss://")) {
    url = url.replace("wss://", "https://");
  }
  
  // Retirer /api/websocket si présent
  url = url.replace(/\/api\/websocket$/, "");
  
  // Retirer les trailing slashes
  url = url.replace(/\/+$/, "");
  
  return url;
}

/**
 * Vérifie les assets Neolia pour tous les étages via l'Edge Function Supabase.
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

  if (!baseUrl || !token) {
    console.warn("[Neolia] URL ou token manquant pour checkAllFloorsNeoliaAssets");
    return floors.map((floor) => ({
      floorId: floor.id || floor.floor_id || floor.slug || floor.uid,
      floorName: floor.name || floor.id || "Inconnu",
      jsonAvailable: false,
      pngAvailable: false,
    }));
  }

  console.debug("[Neolia] Appel de l'Edge Function neolia-assets avec", {
    baseUrl,
    floorsCount: floors.length,
  });

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  try {
    // Préparer les données pour l'Edge Function
    const floorsInput = floors.map((floor) => ({
      id: floor.id || floor.floor_id || floor.slug || floor.uid,
      name: floor.name,
    }));

    // Appeler l'Edge Function
    const { data, error } = await supabase.functions.invoke("neolia-assets", {
      body: {
        haBaseUrl: normalizedBaseUrl,
        haToken: token,
        floors: floorsInput,
      },
    });

    if (error) {
      console.error("[Neolia] Erreur lors de l'appel à l'Edge Function:", error);
      return floors.map((floor) => ({
        floorId: floor.id || floor.floor_id || floor.slug || floor.uid,
        floorName: floor.name || floor.id || "Inconnu",
        jsonAvailable: false,
        pngAvailable: false,
      }));
    }

    if (!data || !Array.isArray(data.assets)) {
      console.warn("[Neolia] Réponse inattendue de l'Edge Function:", data);
      return floors.map((floor) => ({
        floorId: floor.id || floor.floor_id || floor.slug || floor.uid,
        floorName: floor.name || floor.id || "Inconnu",
        jsonAvailable: false,
        pngAvailable: false,
      }));
    }

    console.debug("[Neolia] Assets récupérés avec succès:", data.assets);
    return data.assets;
  } catch (error) {
    console.error("[Neolia] Exception lors de la vérification des assets:", error);
    return floors.map((floor) => ({
      floorId: floor.id || floor.floor_id || floor.slug || floor.uid,
      floorName: floor.name || floor.id || "Inconnu",
      jsonAvailable: false,
      pngAvailable: false,
    }));
  }
}
