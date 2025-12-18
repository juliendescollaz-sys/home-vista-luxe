/**
 * Service for managing room photos stored in Home Assistant
 * Photos are stored in /config/www/neolia/pieces/ and served via /local/neolia/pieces/
 * Metadata is stored in room_photos.json
 */

import type { RoomPhotosJson, RoomPhotoMetadata, PhotoUploadOptions, RoomPhotoAccess } from "@/types/roomPhotos";

const HA_PHOTOS_PATH = "/local/neolia/pieces";
const JSON_FILENAME = "room_photos.json";

// Helper to hash parental code with SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

// Generate filename following convention: room_<roomId>__by_<userId>__<timestamp>.jpg
function generateFilename(roomId: string, userId: string): string {
  const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  return `room_${safeRoomId}__by_${safeUserId}__${timestamp}.jpg`;
}

// Fetch room_photos.json metadata from HA
export async function fetchRoomPhotosMetadata(
  haBaseUrl: string,
  haToken: string
): Promise<RoomPhotosJson> {
  const url = `${haBaseUrl}${HA_PHOTOS_PATH}/${JSON_FILENAME}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${haToken}`,
      },
    });
    
    if (response.status === 404) {
      // Return empty structure if file doesn't exist
      return { version: 1, rooms: {} };
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch room photos metadata: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("[RoomPhotos] Could not fetch metadata, using empty:", error);
    return { version: 1, rooms: {} };
  }
}

// Upload photo and metadata via Edge Function
export async function uploadRoomPhoto(
  haBaseUrl: string,
  haToken: string,
  roomId: string,
  userId: string,
  imageFile: File,
  options: PhotoUploadOptions
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const filename = generateFilename(roomId, userId);
  
  // Convert file to base64 for Edge Function
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
  
  // Hash parental code if provided
  let parentalCodeHash: string | undefined;
  if (options.locked && options.parentalCode) {
    parentalCodeHash = await hashCode(options.parentalCode);
  }
  
  const response = await fetch(`${supabaseUrl}/functions/v1/ha-room-photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      haBaseUrl,
      haToken,
      action: "upload",
      roomId,
      userId,
      filename,
      imageBase64: base64,
      metadata: {
        shared: options.shared,
        locked: options.locked,
        parentalCodeHash,
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Upload failed: ${response.status}`);
  }
  
  const result = await response.json();
  return result.photoUrl;
}

// Delete room photo via Edge Function
export async function deleteRoomPhoto(
  haBaseUrl: string,
  haToken: string,
  roomId: string
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/ha-room-photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      haBaseUrl,
      haToken,
      action: "delete",
      roomId,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Delete failed: ${response.status}`);
  }
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

// Build photo URL with cache busting
export function getPhotoUrl(
  haBaseUrl: string,
  photoUrl: string,
  updatedAt: string
): string {
  const timestamp = new Date(updatedAt).getTime();
  return `${haBaseUrl}${photoUrl}?v=${timestamp}`;
}
