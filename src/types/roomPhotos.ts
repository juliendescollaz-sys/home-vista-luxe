/**
 * Types for room photos stored in Home Assistant
 */

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

export interface PhotoUploadOptions {
  shared: boolean;
  locked: boolean;
  parentalCode?: string; // Raw code, will be hashed before storing
}

export interface RoomPhotoAccess {
  canView: boolean;
  canEdit: boolean;
  requiresUnlock: boolean;
  isOwner: boolean;
}
