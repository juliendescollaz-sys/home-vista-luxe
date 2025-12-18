/**
 * Service for managing room photos stored in localStorage
 * Photos are stored as base64 data URLs locally on each device
 * This is a device-local storage solution - photos do not sync across devices
 */

import type { RoomPhotosJson, RoomPhotoMetadata, PhotoUploadOptions, RoomPhotoAccess } from "@/types/roomPhotos";

const STORAGE_KEY = "neolia_room_photos";

// Helper to hash parental code with SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

// Get room photos metadata from localStorage
export function getRoomPhotosMetadata(): RoomPhotosJson {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("[RoomPhotos] Could not read from localStorage:", error);
  }
  return { version: 1, rooms: {} };
}

// Save room photos metadata to localStorage
function saveRoomPhotosMetadata(metadata: RoomPhotosJson): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error("[RoomPhotos] Could not save to localStorage:", error);
    throw new Error("Impossible de sauvegarder la photo (stockage local plein)");
  }
}

// Upload photo (store as base64 in localStorage)
export async function uploadRoomPhoto(
  roomId: string,
  userId: string,
  imageFile: File,
  options: PhotoUploadOptions
): Promise<string> {
  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
  
  // Hash parental code if provided
  let parentalCodeHash: string | undefined;
  if (options.locked && options.parentalCode) {
    parentalCodeHash = await hashCode(options.parentalCode);
  }
  
  // Get current metadata and update
  const metadata = getRoomPhotosMetadata();
  metadata.rooms[roomId] = {
    photoUrl: base64, // Store base64 directly as the URL
    ownerUserId: userId,
    shared: options.shared,
    locked: options.locked,
    parentalCodeHash,
    updatedAt: new Date().toISOString(),
  };
  
  saveRoomPhotosMetadata(metadata);
  return base64;
}

// Delete room photo
export function deleteRoomPhoto(roomId: string): void {
  const metadata = getRoomPhotosMetadata();
  delete metadata.rooms[roomId];
  saveRoomPhotosMetadata(metadata);
}

// Check access permissions for a room photo
export function checkPhotoAccess(
  metadata: RoomPhotoMetadata | undefined,
  currentUserId: string
): RoomPhotoAccess {
  if (!metadata) {
    return {
      canView: false,
      canEdit: true, // Can add new photo
      requiresUnlock: false,
      isOwner: false,
    };
  }
  
  const isOwner = metadata.ownerUserId === currentUserId;
  
  if (isOwner) {
    return {
      canView: true,
      canEdit: true,
      requiresUnlock: false,
      isOwner: true,
    };
  }
  
  // Not owner
  if (!metadata.shared) {
    return {
      canView: false,
      canEdit: false,
      requiresUnlock: false,
      isOwner: false,
    };
  }
  
  // Shared photo
  if (metadata.locked) {
    return {
      canView: true,
      canEdit: false,
      requiresUnlock: true,
      isOwner: false,
    };
  }
  
  return {
    canView: true,
    canEdit: true,
    requiresUnlock: false,
    isOwner: false,
  };
}

// Verify parental code
export async function verifyParentalCode(
  metadata: RoomPhotoMetadata,
  code: string
): Promise<boolean> {
  if (!metadata.parentalCodeHash) return false;
  const hash = await hashCode(code);
  return hash === metadata.parentalCodeHash;
}

// Get photo URL (for localStorage, just return the base64 directly)
export function getPhotoUrl(photoUrl: string): string {
  return photoUrl;
}
