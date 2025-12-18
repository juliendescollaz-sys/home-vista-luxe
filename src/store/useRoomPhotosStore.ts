/**
 * Zustand store for room photos management
 * Uses Home Assistant custom endpoint for photo storage
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoomPhotosJson, RoomPhotoMetadata, RoomPhotoAccess, PhotoUploadOptions } from "@/types/roomPhotos";
import {
  loadRoomPhotosMetadata,
  uploadRoomPhoto,
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
  unlockedRooms: string[]; // Rooms unlocked via parental code this session (array for serialization)
  
  // HA connection info (needed for API calls)
  haBaseUrl: string | null;
  haToken: string | null;
  
  // Actions
  setHAConnection: (baseUrl: string, token: string) => void;
  setCurrentUserId: (userId: string) => void;
  loadMetadata: () => Promise<void>;
  uploadPhoto: (
    roomId: string,
    imageFile: File,
    options: PhotoUploadOptions
  ) => Promise<string>;
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
      unlockedRooms: [],
      haBaseUrl: null,
      haToken: null,
      
      setHAConnection: (baseUrl: string, token: string) => {
        set({ haBaseUrl: baseUrl, haToken: token });
      },
      
      setCurrentUserId: (userId: string) => {
        set({ currentUserId: userId });
      },
      
      loadMetadata: async () => {
        const { haBaseUrl, haToken } = get();
        
        if (!haBaseUrl || !haToken) {
          console.warn("[RoomPhotos] No HA connection configured, skipping metadata load");
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const metadata = await loadRoomPhotosMetadata(haBaseUrl, haToken);
          set({ metadata, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to load metadata";
          console.error("[RoomPhotos] Load metadata error:", error);
          set({ isLoading: false, error: message });
        }
      },
      
      uploadPhoto: async (
        roomId: string,
        imageFile: File,
        options: PhotoUploadOptions
      ) => {
        const { currentUserId, haBaseUrl, haToken } = get();
        
        if (!haBaseUrl || !haToken) {
          throw new Error("Home Assistant non connecté");
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const result = await uploadRoomPhoto(
            haBaseUrl,
            haToken,
            roomId,
            currentUserId,
            imageFile,
            options
          );
          
          // Update metadata from response
          if (result.metadata) {
            set({ metadata: result.metadata, isLoading: false });
          } else {
            // Reload metadata if not returned in response
            const metadata = await loadRoomPhotosMetadata(haBaseUrl, haToken);
            set({ metadata, isLoading: false });
          }
          
          return result.photoUrl;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed";
          set({ isLoading: false, error: message });
          throw error;
        }
      },
      
      getAccess: (roomId: string) => {
        const { metadata, currentUserId, unlockedRooms } = get();
        const roomMetadata = metadata.rooms[roomId];
        const access = checkPhotoAccess(roomMetadata, currentUserId);
        
        // If room was unlocked this session, allow editing
        if (unlockedRooms.includes(roomId) && access.requiresUnlock) {
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
          // Add to unlocked rooms if not already there
          if (!unlockedRooms.includes(roomId)) {
            set({ unlockedRooms: [...unlockedRooms, roomId] });
          }
        }
        return isValid;
      },
      
      getPhotoUrlForRoom: (roomId: string) => {
        const { metadata, currentUserId, haBaseUrl } = get();
        const roomMetadata = metadata.rooms[roomId];
        
        if (!roomMetadata || !haBaseUrl) return null;
        
        const access = checkPhotoAccess(roomMetadata, currentUserId);
        if (!access.canView) return null;
        
        return getPhotoUrl(haBaseUrl, roomMetadata.photoUrl, roomMetadata.updatedAt);
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
        // Don't persist metadata - it's loaded from HA
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<RoomPhotosStore>),
        unlockedRooms: [], // Always start with empty unlocked rooms
      }),
    }
  )
);
