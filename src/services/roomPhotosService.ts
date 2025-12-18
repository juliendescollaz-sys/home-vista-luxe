/**
 * Service for managing room photos - LOCAL STORAGE ONLY
 * 
 * Photos are stored locally on the device using localStorage.
 * No network calls, no cloud, no Home Assistant dependency.
 */

import type { LocalRoomPhoto, LocalRoomPhotosData } from "@/types/roomPhotos";

const STORAGE_KEY = "neolia_room_photos_v1";

/**
 * Get all locally stored room photos
 */
export function getLocalRoomPhotos(): LocalRoomPhotosData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as LocalRoomPhotosData;
  } catch (error) {
    console.warn("[RoomPhotos] Failed to read from localStorage:", error);
    return {};
  }
}

/**
 * Get photo for a specific room
 */
export function getLocalRoomPhoto(areaId: string): LocalRoomPhoto | null {
  const photos = getLocalRoomPhotos();
  return photos[areaId] ?? null;
}

/**
 * Save photo for a room (converts File to base64)
 */
export async function setLocalRoomPhoto(areaId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        const photos = getLocalRoomPhotos();
        
        photos[areaId] = {
          data: base64,
          updatedAt: new Date().toISOString(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
        console.log("[RoomPhotos] Photo saved locally for:", areaId);
        resolve(base64);
      } catch (error) {
        console.error("[RoomPhotos] Failed to save photo:", error);
        reject(new Error("Erreur lors de l'enregistrement de la photo"));
      }
    };
    
    reader.onerror = () => {
      console.error("[RoomPhotos] Failed to read file:", reader.error);
      reject(new Error("Erreur lors de la lecture du fichier"));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Delete photo for a room
 */
export function deleteLocalRoomPhoto(areaId: string): void {
  try {
    const photos = getLocalRoomPhotos();
    delete photos[areaId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    console.log("[RoomPhotos] Photo deleted for:", areaId);
  } catch (error) {
    console.warn("[RoomPhotos] Failed to delete photo:", error);
  }
}

/**
 * Get photo URL (base64 data URL) for a room
 */
export function getPhotoUrl(areaId: string): string | null {
  const photo = getLocalRoomPhoto(areaId);
  return photo?.data ?? null;
}
