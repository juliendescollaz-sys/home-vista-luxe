/**
 * Types for room photos
 * - Local-only (current)
 * - Shared/HA-backed (future option)
 */

// -------- Local-only (CURRENT) --------
export interface LocalRoomPhoto {
  data: string;        // base64 data URL
  updatedAt: string;   // ISO8601
}

export type LocalRoomPhotosData = Record<string, LocalRoomPhoto>;

// In local-only mode, upload options are ignored, but we keep the type
// for UI compatibility (Rooms.tsx calls uploadPhoto(areaId, file, options)).
export type PhotoUploadOptions = Partial<{
  shared: boolean;
  locked: boolean;
  parentalCode: string;
}>;

// Access is always allowed on the same device (for now)
export interface RoomPhotoAccess {
  canView: boolean;
  canEdit: boolean;
  requiresUnlock: boolean;
  isOwner: boolean;
}

// -------- Shared/HA-backed (FUTURE) --------
export interface RoomPhotoMetadata {
  photoUrl: string;
  ownerUserId: string;
  shared: boolean;
  locked: boolean;
  parentalCodeHash?: string; // sha256:<hash>
  updatedAt: string; // ISO8601
}

export interface RoomPhotosJson {
  version: number;
  rooms: Record<string, RoomPhotoMetadata>;
}
