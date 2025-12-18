/**
 * Service for managing room photos stored in Home Assistant.
 *
 * IMPORTANT (PWA/iOS): direct browser calls to Home Assistant custom endpoints can fail
 * with CORS/network errors ("Failed to fetch").
 *
 * To make it reliable, this service calls a backend proxy function (ha-room-photos)
 * which then calls Home Assistant server-to-server.
 */

import type {
  RoomPhotosJson,
  RoomPhotoMetadata,
  PhotoUploadOptions,
  RoomPhotoAccess,
} from "@/types/roomPhotos";

function getBackendConfig(): { functionsUrl: string; apikey: string } {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!baseUrl || !apikey) {
    throw new Error("Backend non configuré");
  }

  return {
    functionsUrl: `${baseUrl}/functions/v1/ha-room-photos`,
    apikey,
  };
}

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
    const { functionsUrl, apikey } = getBackendConfig();

    const response = await fetch(functionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey,
      },
      body: JSON.stringify({
        action: "metadata",
        haBaseUrl,
        haToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("[RoomPhotos] Failed to load metadata via backend:", response.status, errorText);
      return { version: 1, rooms: {} };
    }

    const metadata = (await response.json()) as RoomPhotosJson;
    return {
      version: metadata?.version ?? 1,
      rooms: metadata?.rooms ?? {},
    };
  } catch (error) {
    console.warn("[RoomPhotos] Could not load metadata:", error);
    return { version: 1, rooms: {} };
  }
}

// Upload photo to Home Assistant via custom endpoint (proxied)
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

  const { functionsUrl, apikey } = getBackendConfig();

  // Create FormData for upload (sent to backend proxy)
  const formData = new FormData();
  formData.append("haBaseUrl", haBaseUrl);
  formData.append("haToken", haToken);
  formData.append("file", imageFile);
  formData.append("roomId", roomId);
  formData.append("userId", userId);
  formData.append("shared", options.shared ? "true" : "false");
  formData.append("locked", options.locked ? "true" : "false");
  if (parentalCodeHash) {
    formData.append("parentalCodeHash", parentalCodeHash);
  }

  const response = await fetch(functionsUrl, {
    method: "POST",
    headers: {
      apikey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[RoomPhotos] Upload failed via backend:", response.status, errorText);
    throw new Error(`Upload failed: ${response.status}`);
  }

  const result = await response.json();

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
