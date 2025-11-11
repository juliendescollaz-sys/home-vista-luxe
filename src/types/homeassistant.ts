export interface HAConnection {
  url: string;
  token: string;
  connected: boolean;
}

export interface HAEntity {
  entity_id: string;
  state: string;
  last_changed?: string;
  last_updated?: string;
  attributes: {
    friendly_name?: string;
    device_class?: string;
    unit_of_measurement?: string;
    icon?: string;
    // weather.* specific attributes
    temperature?: number;
    humidity?: number;
    pressure?: number;
    wind_speed?: number;
    wind_bearing?: number;
    visibility?: number;
    forecast?: Array<any>;
    precipitation?: number;
    // media_player attributes
    media_position?: number;
    media_duration?: number;
    media_position_updated_at?: string;
    // allow any other attributes
    [k: string]: any;
  };
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
