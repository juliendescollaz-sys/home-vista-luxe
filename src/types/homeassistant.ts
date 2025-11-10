export interface HAConnection {
  url: string;
  token: string;
  connected: boolean;
}

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
  floor_id?: string;
}

export interface HAFloor {
  floor_id: string;
  name: string;
  level: number;
}

export interface HADevice {
  id: string;
  name: string;
  name_by_user?: string;
  area_id?: string;
  model?: string;
  manufacturer?: string;
  disabled_by?: string | null;
}

export interface HAScene {
  entity_id: string;
  name: string;
  attributes: Record<string, any>;
}

export interface HAEvent {
  event_type: string;
  time_fired: string;
  data: Record<string, any>;
}

export type EntityDomain =
  | "light"
  | "switch"
  | "sensor"
  | "binary_sensor"
  | "media_player"
  | "climate"
  | "cover"
  | "lock"
  | "camera"
  | "scene"
  | "script"
  | "button";
