/**
 * Zustand store for room photos management
 * Uses localStorage for device-local photo storage
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoomPhotosJson, RoomPhotoMetadata, RoomPhotoAccess, PhotoUploadOptions } from "@/types/roomPhotos";
import {
  getRoomPhotosMetadata,
  uploadRoomPhoto,
  deleteRoomPhoto,
  checkPhotoAccess,
  verifyParentalCode,
  getPhotoUrl,
} from "@/services/roomPhotosService";

interface RoomPhotosStore {
  // State
  metadata: RoomPhotosJson;
  isLoading: boolean;
  error: string | null;
  currentUserId: string;
  unlockedRooms: Set<string>; // Rooms unlocked via parental code this session
  
  // Actions
  setCurrentUserId: (userId: string) => void;
  loadMetadata: () => void;
  uploadPhoto: (
    roomId: string,
    imageFile: File,
    options: PhotoUploadOptions
  ) => Promise<string>;
  deletePhoto: (roomId: string) => void;
  getAccess: (roomId: string) => RoomPhotoAccess;
  unlockRoom: (roomId: string, code: string) => Promise<boolean>;
  getPhotoUrlForRoom: (roomId: string) => string | null;
  getRoomMetadata: (roomId: string) => RoomPhotoMetadata | undefined;
}

export const useRoomPhotosStore = create<RoomPhotosStore>()(
  persist(
    (set, get) => ({
      metadata: { version: 1, rooms: {} },
      isLoading: false,
      error: null,
      currentUserId: "",
      unlockedRooms: new Set(),
      
      setCurrentUserId: (userId: string) => {
        set({ currentUserId: userId });
      },
      
      loadMetadata: () => {
        const metadata = getRoomPhotosMetadata();
        set({ metadata, isLoading: false, error: null });
      },
      
      uploadPhoto: async (
        roomId: string,
        imageFile: File,
        options: PhotoUploadOptions
      ) => {
        const { currentUserId } = get();
        set({ isLoading: true, error: null });
        
        try {
          const photoUrl = await uploadRoomPhoto(roomId, currentUserId, imageFile, options);
          // Reload metadata after upload
          const metadata = getRoomPhotosMetadata();
          set({ metadata, isLoading: false });
          return photoUrl;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed";
          set({ isLoading: false, error: message });
          throw error;
        }
      },
      
      deletePhoto: (roomId: string) => {
        deleteRoomPhoto(roomId);
        const metadata = getRoomPhotosMetadata();
        set({ metadata });
      },
      
      getAccess: (roomId: string) => {
        const { metadata, currentUserId, unlockedRooms } = get();
        const roomMetadata = metadata.rooms[roomId];
        const access = checkPhotoAccess(roomMetadata, currentUserId);
        
        // If room was unlocked this session, allow editing
        if (unlockedRooms.has(roomId) && access.requiresUnlock) {
          return {
            ...access,
            canEdit: true,
            requiresUnlock: false,
          };
        }
        
        return access;
      },
      
      unlockRoom: async (roomId: string, code: string) => {
        const { metadata, unlockedRooms } = get();
        const roomMetadata = metadata.rooms[roomId];
        
        if (!roomMetadata) return false;
        
        const isValid = await verifyParentalCode(roomMetadata, code);
        if (isValid) {
          const newUnlockedRooms = new Set(unlockedRooms);
          newUnlockedRooms.add(roomId);
          set({ unlockedRooms: newUnlockedRooms });
        }
        return isValid;
      },
      
      getPhotoUrlForRoom: (roomId: string) => {
        const { metadata, currentUserId } = get();
        const roomMetadata = metadata.rooms[roomId];
        
        if (!roomMetadata) return null;
        
        const access = checkPhotoAccess(roomMetadata, currentUserId);
        if (!access.canView) return null;
        
        return getPhotoUrl(roomMetadata.photoUrl);
      },
      
      getRoomMetadata: (roomId: string) => {
        const { metadata } = get();
        return metadata.rooms[roomId];
      },
    }),
    {
      name: "neolia-room-photos-store",
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        // Don't persist unlockedRooms - it's session-only
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<RoomPhotosStore>),
        unlockedRooms: new Set(), // Always start with empty unlocked rooms
      }),
    }
  )
);
