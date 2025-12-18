/**
 * Zustand store for room photos - LOCAL STORAGE ONLY (compat layer)
 *
 * Goal: keep the existing UI (Rooms.tsx + components) working WITHOUT refactor,
 * while disabling all cloud/HA sharing logic.
 *
 * - Photos are stored locally (localStorage via roomPhotosService)
 * - "shared/locked/parentalCode/userId" are ignored for now
 * - Access control always allows edit on the same device
 */

import { create } from "zustand";
import type { LocalRoomPhotosData } from "@/types/roomPhotos";
import type { PhotoUploadOptions, RoomPhotoAccess, RoomPhotoMetadata, RoomPhotosJson } from "@/types/roomPhotos";

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

  // Legacy fields expected by Rooms.tsx (kept for compatibility)
  currentUserId: string | null;

  // Legacy setters expected by Rooms.tsx (no-op for now, but keep signature)
  setCurrentUserId: (userId: string) => void;
  setHAConnection: (_haBaseUrl: string, _haToken: string) => void;

  // Legacy API expected by Rooms.tsx
  loadMetadata: () => Promise<void>;
  uploadPhoto: (areaId: string, file: File, _options: PhotoUploadOptions) => Promise<void>;
  getPhotoUrlForRoom: (areaId: string) => string | null;
  getRoomMetadata: (_areaId: string) => RoomPhotoMetadata | undefined;

  // Access control (disabled, local-only)
  getAccess: (_areaId: string) => RoomPhotoAccess;
  unlockRoom: (_areaId: string, _code: string) => Promise<boolean>;

  // Optional helpers (can be used later)
  removeLocalPhoto: (areaId: string) => void;

  // Debug/compat: expose a "metadata-like" structure if something expects it
  getFakeMetadataJson: () => RoomPhotosJson;
}

export const useRoomPhotosStore = create<RoomPhotosStore>()((set, get) => ({
  photos: {},
  isLoading: false,
  currentUserId: null,

  setCurrentUserId: (userId) => {
    set({ currentUserId: userId });
  },

  setHAConnection: () => {
    // Local-only: we ignore HA connection for now
  },

  loadMetadata: async () => {
    // Local-only: just load from localStorage
    const photos = getLocalRoomPhotos();
    set({ photos });
  },

  uploadPhoto: async (areaId, file, _options) => {
    // Local-only: ignore shared/locked/parentalCode/etc.
    set({ isLoading: true });
    try {
      await setLocalRoomPhoto(areaId, file);
      const photos = getLocalRoomPhotos();
      set({ photos, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  getPhotoUrlForRoom: (areaId) => {
    return getPhotoUrl(areaId);
  },

  getRoomMetadata: (_areaId) => {
    // Local-only: no remote metadata
    return undefined;
  },

  getAccess: (_areaId) => {
    // Local-only: same device, always allow edit/view if present
    return {
      canView: true,
      canEdit: true,
      requiresUnlock: false,
      isOwner: true,
    };
  },

  unlockRoom: async () => {
    // Local-only: nothing to unlock
    return true;
  },

  removeLocalPhoto: (areaId) => {
    deleteLocalRoomPhoto(areaId);
    const photos = getLocalRoomPhotos();
    set({ photos });
  },

  getFakeMetadataJson: () => {
    // If anything expects RoomPhotosJson shape, provide a harmless empty version
    return { version: 1, rooms: {} };
  },
}));
