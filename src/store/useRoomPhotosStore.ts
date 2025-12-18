/**
 * Store for room photos metadata
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoomPhotosJson, RoomPhotoMetadata, PhotoUploadOptions, RoomPhotoAccess } from "@/types/roomPhotos";
import {
  fetchRoomPhotosMetadata,
  uploadRoomPhoto,
  deleteRoomPhoto,
  checkPhotoAccess,
  verifyParentalCode,
  getPhotoUrl,
} from "@/services/roomPhotosService";

interface RoomPhotosStore {
  // State
  metadata: RoomPhotosJson | null;
  isLoading: boolean;
  error: string | null;
  currentUserId: string;
  unlockedRooms: Set<string>; // Rooms unlocked via parental code in current session
  
  // Actions
  setCurrentUserId: (userId: string) => void;
  loadMetadata: (haBaseUrl: string, haToken: string) => Promise<void>;
  uploadPhoto: (
    haBaseUrl: string,
    haToken: string,
    roomId: string,
    imageFile: File,
    options: PhotoUploadOptions
  ) => Promise<string>;
  deletePhoto: (haBaseUrl: string, haToken: string, roomId: string) => Promise<void>;
  getAccess: (roomId: string) => RoomPhotoAccess;
  unlockRoom: (roomId: string, code: string) => Promise<boolean>;
  getPhotoUrlForRoom: (haBaseUrl: string, roomId: string) => string | null;
  getRoomMetadata: (roomId: string) => RoomPhotoMetadata | undefined;
}

export const useRoomPhotosStore = create<RoomPhotosStore>()(
  persist(
    (set, get) => ({
      metadata: null,
      isLoading: false,
      error: null,
      currentUserId: "",
      unlockedRooms: new Set(),

      setCurrentUserId: (userId) => set({ currentUserId: userId }),

      loadMetadata: async (haBaseUrl, haToken) => {
        set({ isLoading: true, error: null });
        try {
          const metadata = await fetchRoomPhotosMetadata(haBaseUrl, haToken);
          set({ metadata, isLoading: false });
        } catch (error) {
          console.error("[RoomPhotos] Failed to load metadata:", error);
          set({
            error: error instanceof Error ? error.message : "Failed to load",
            isLoading: false,
          });
        }
      },

      uploadPhoto: async (haBaseUrl, haToken, roomId, imageFile, options) => {
        const { currentUserId } = get();
        if (!currentUserId) {
          throw new Error("User ID not set");
        }

        set({ isLoading: true, error: null });
        try {
          const photoUrl = await uploadRoomPhoto(
            haBaseUrl,
            haToken,
            roomId,
            currentUserId,
            imageFile,
            options
          );

          // Refresh metadata after upload
          const metadata = await fetchRoomPhotosMetadata(haBaseUrl, haToken);
          set({ metadata, isLoading: false });

          return photoUrl;
        } catch (error) {
          console.error("[RoomPhotos] Failed to upload:", error);
          set({
            error: error instanceof Error ? error.message : "Upload failed",
            isLoading: false,
          });
          throw error;
        }
      },

      deletePhoto: async (haBaseUrl, haToken, roomId) => {
        set({ isLoading: true, error: null });
        try {
          await deleteRoomPhoto(haBaseUrl, haToken, roomId);

          // Refresh metadata after delete
          const metadata = await fetchRoomPhotosMetadata(haBaseUrl, haToken);
          set({ metadata, isLoading: false });
        } catch (error) {
          console.error("[RoomPhotos] Failed to delete:", error);
          set({
            error: error instanceof Error ? error.message : "Delete failed",
            isLoading: false,
          });
          throw error;
        }
      },

      getAccess: (roomId) => {
        const { metadata, currentUserId, unlockedRooms } = get();
        const roomMeta = metadata?.rooms[roomId];

        const baseAccess = checkPhotoAccess(roomMeta, currentUserId);

        // Check if room was unlocked in this session
        if (baseAccess.requiresUnlock && unlockedRooms.has(roomId)) {
          return {
            ...baseAccess,
            canEdit: true,
            requiresUnlock: false,
          };
        }

        return baseAccess;
      },

      unlockRoom: async (roomId, code) => {
        const { metadata, unlockedRooms } = get();
        const roomMeta = metadata?.rooms[roomId];

        if (!roomMeta) return false;

        const isValid = await verifyParentalCode(roomMeta, code);

        if (isValid) {
          const newUnlockedRooms = new Set(unlockedRooms);
          newUnlockedRooms.add(roomId);
          set({ unlockedRooms: newUnlockedRooms });
        }

        return isValid;
      },

      getPhotoUrlForRoom: (haBaseUrl, roomId) => {
        const { metadata, currentUserId, unlockedRooms } = get();
        const roomMeta = metadata?.rooms[roomId];

        if (!roomMeta) return null;

        // Check access
        const isOwner = roomMeta.ownerUserId === currentUserId;
        const canView = isOwner || roomMeta.shared || unlockedRooms.has(roomId);

        if (!canView) return null;

        return getPhotoUrl(haBaseUrl, roomMeta.photoUrl, roomMeta.updatedAt);
      },

      getRoomMetadata: (roomId) => {
        const { metadata } = get();
        return metadata?.rooms[roomId];
      },
    }),
    {
      name: "neolia-room-photos-store",
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        // Don't persist unlockedRooms - they reset on app restart
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<RoomPhotosStore>),
        unlockedRooms: new Set(), // Always start with empty unlocked rooms
      }),
    }
  )
);
