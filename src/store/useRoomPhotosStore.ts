/**
 * Zustand store for room photos - LOCAL STORAGE ONLY
 * 
 * Photos are stored locally on the device.
 * No network calls, no cloud, no Home Assistant dependency.
 */

import { create } from "zustand";
import type { LocalRoomPhotosData } from "@/types/roomPhotos";
import {
  getLocalRoomPhotos,
  setLocalRoomPhoto,
  deleteLocalRoomPhoto,
  getPhotoUrl,
} from "@/services/roomPhotosService";

interface RoomPhotosStore {
  // State
  photos: LocalRoomPhotosData;
  isLoading: boolean;

  // Actions
  loadPhotos: () => void;
  setPhoto: (areaId: string, file: File) => Promise<string>;
  removePhoto: (areaId: string) => void;
  getPhoto: (areaId: string) => string | null;
}

export const useRoomPhotosStore = create<RoomPhotosStore>()((set, get) => ({
  photos: {},
  isLoading: false,

  loadPhotos: () => {
    const photos = getLocalRoomPhotos();
    set({ photos });
  },

  setPhoto: async (areaId: string, file: File) => {
    set({ isLoading: true });
    try {
      const dataUrl = await setLocalRoomPhoto(areaId, file);
      // Refresh photos from storage
      const photos = getLocalRoomPhotos();
      set({ photos, isLoading: false });
      return dataUrl;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removePhoto: (areaId: string) => {
    deleteLocalRoomPhoto(areaId);
    // Refresh photos from storage
    const photos = getLocalRoomPhotos();
    set({ photos });
  },

  getPhoto: (areaId: string) => {
    return getPhotoUrl(areaId);
  },
}));
