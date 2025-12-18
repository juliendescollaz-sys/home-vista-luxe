/**
 * Service for managing room photos stored in Home Assistant
 * Photos are uploaded via POST /api/neolia/room_photo
 * Metadata is loaded from /local/neolia/pieces/room_photos.json
 */

import type { RoomPhotosJson, RoomPhotoMetadata, PhotoUploadOptions, RoomPhotoAccess } from "@/types/roomPhotos";

// Helper to hash parental code with SHA-256
export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

// Load room photos metadata from Home Assistant
export async function loadRoomPhotosMetadata(
  haBaseUrl: string,
  haToken: string
): Promise<RoomPhotosJson> {
  try {
    const metadataUrl = `${haBaseUrl}/local/neolia/pieces/room_photos.json`;
    const response = await fetch(metadataUrl, {
      headers: {
        Authorization: `Bearer ${haToken}`,
      },
    });

    if (response.status === 404) {
      // No metadata file yet - return empty
      console.log("[RoomPhotos] No metadata file found (404), returning empty");
      return { version: 1, rooms: {} };
    }

    if (!response.ok) {
      console.warn("[RoomPhotos] Failed to load metadata:", response.status);
      return { version: 1, rooms: {} };
    }

    const metadata = await response.json();
    console.log("[RoomPhotos] Loaded metadata:", Object.keys(metadata.rooms || {}).length, "rooms");
    return metadata;
  } catch (error) {
    console.warn("[RoomPhotos] Could not load metadata from HA:", error);
    return { version: 1, rooms: {} };
  }
}

// Upload photo to Home Assistant via custom endpoint
export async function uploadRoomPhoto(
  haBaseUrl: string,
  haToken: string,
  roomId: string,
  userId: string,
  imageFile: File,
  options: PhotoUploadOptions
): Promise<{ photoUrl: string; metadata: RoomPhotosJson }> {
  // Hash parental code if provided
  let parentalCodeHash = "";
  if (options.locked && options.parentalCode) {
    parentalCodeHash = await hashCode(options.parentalCode);
  }

  // Create FormData for upload
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("roomId", roomId);
  formData.append("userId", userId);
  formData.append("shared", options.shared ? "true" : "false");
  formData.append("locked", options.locked ? "true" : "false");
  if (parentalCodeHash) {
    formData.append("parentalCodeHash", parentalCodeHash);
  }

  const uploadUrl = `${haBaseUrl}/api/neolia/room_photo`;
  console.log("[RoomPhotos] Uploading to:", uploadUrl);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${haToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[RoomPhotos] Upload failed:", response.status, errorText);
    throw new Error(`Upload failed: ${response.status}`);
  }

  const result = await response.json();
  console.log("[RoomPhotos] Upload successful:", result);

  return {
    photoUrl: result.photoUrl,
    metadata: result.metadata || { version: 1, rooms: {} },
  };
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

// Get photo URL with cache-busting
export function getPhotoUrl(
  haBaseUrl: string,
  photoUrl: string,
  updatedAt?: string
): string {
  // photoUrl is relative like /local/neolia/pieces/room_xxx.jpg
  const fullUrl = `${haBaseUrl}${photoUrl}`;
  
  // Add cache-busting param
  if (updatedAt) {
    return `${fullUrl}?v=${encodeURIComponent(updatedAt)}`;
  }
  
  return fullUrl;
}
