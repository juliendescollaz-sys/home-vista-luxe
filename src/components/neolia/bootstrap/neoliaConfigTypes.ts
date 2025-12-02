// src/components/neolia/bootstrap/neoliaConfigTypes.ts

export interface NeoliaFloor {
  id: string;
  name: string;
}

export interface NeoliaRoom {
  id: string;
  name: string;
  floor_id: string;
}

export interface NeoliaHomeStructure {
  floors: NeoliaFloor[];
  rooms: NeoliaRoom[];
  devices: unknown[];
  ha?: {
    url: string;
    token: string;
  };
}

export interface NeoliaNetworkConfig {
  mqtt_host: string;
  mqtt_port: number;
}

export interface NeoliaPanelConfig {
  default_page: string;
  theme: string;
}

export interface NeoliaGlobalConfig {
  service: string;
  version: number;
  site?: {
    name?: string;
    timezone?: string;
  };
  network: NeoliaNetworkConfig;
  panel: NeoliaPanelConfig;
  home_structure: NeoliaHomeStructure;
}

export interface NeoliaHaConnection {
  baseUrl: string;
  token: string;
  mqttHost: string;
  mqttPort: number;
}
