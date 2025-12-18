/**
 * Types for room photos - local storage only
 */

export interface LocalRoomPhoto {
  data: string; // base64 data URL
  updatedAt: string; // ISO8601
}

export interface LocalRoomPhotosData {
  [areaId: string]: LocalRoomPhoto;
}

// Legacy types kept for compatibility (unused but prevent import errors)
export interface PhotoUploadOptions {
  shared?: boolean;
  locked?: boolean;
  parentalCode?: string;
}

export interface RoomPhotoAccess {
  canView: boolean;
  canEdit: boolean;
  requiresUnlock: boolean;
  isOwner: boolean;
}

export interface RoomPhotoMetadata {
  photoUrl?: string;
  shared?: boolean;
  locked?: boolean;
  ownerUserId?: string;
}

export interface RoomPhotosJson {
  version: number;
  rooms: Record<string, RoomPhotoMetadata>;
}
