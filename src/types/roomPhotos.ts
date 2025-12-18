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
