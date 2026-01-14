/**
 * Store Zustand pour Home Assistant
 * Gere la connexion WebSocket et l'etat des entites
 */
import { create } from 'zustand';

// Types Home Assistant
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
  level?: number;
}

export interface HADevice {
  id: string;
  name: string;
  area_id?: string;
}

export interface HAEntityRegistry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  name?: string;
  icon?: string;
  disabled_by?: string;
  hidden_by?: string;
}

interface HAStore {
  // Etat connexion
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Donnees HA
  entities: HAEntity[];
  areas: HAArea[];
  floors: HAFloor[];
  devices: HADevice[];
  entityRegistry: HAEntityRegistry[];
  favorites: string[];

  // WebSocket
  ws: WebSocket | null;
  messageId: number;

  // Actions
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => void;
  callService: (domain: string, service: string, data?: Record<string, any>, target?: { entity_id: string }) => Promise<void>;
  setEntities: (entities: HAEntity[]) => void;
  updateEntity: (entity: HAEntity) => void;
  setAreas: (areas: HAArea[]) => void;
  setFloors: (floors: HAFloor[]) => void;
  setDevices: (devices: HADevice[]) => void;
  setEntityRegistry: (registry: HAEntityRegistry[]) => void;
}

export const useHAStore = create<HAStore>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  error: null,
  entities: [],
  areas: [],
  floors: [],
  devices: [],
  entityRegistry: [],
  favorites: [],
  ws: null,
  messageId: 1,

  connect: async (url: string, token: string) => {
    const { ws: existingWs } = get();
    if (existingWs) {
      existingWs.close();
    }

    set({ isConnecting: true, error: null });

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = url.replace(/^http/, 'ws') + '/api/websocket';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[HA] WebSocket connected');
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          handleMessage(message, ws, token, set, get, resolve);
        };

        ws.onerror = (error) => {
          console.error('[HA] WebSocket error', error);
          set({ isConnecting: false, isConnected: false, error: 'Erreur connexion' });
          reject(error);
        };

        ws.onclose = () => {
          console.log('[HA] WebSocket closed');
          set({ isConnected: false, ws: null });
        };

        set({ ws });
      } catch (error) {
        console.error('[HA] Connection error', error);
        set({ isConnecting: false, error: 'Erreur connexion' });
        reject(error);
      }
    });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }
    set({ ws: null, isConnected: false });
  },

  callService: async (domain, service, data = {}, target) => {
    const { ws, messageId } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = messageId;
    set({ messageId: messageId + 1 });

    const message: any = {
      id,
      type: 'call_service',
      domain,
      service,
      service_data: data,
    };

    if (target) {
      message.target = target;
    }

    ws.send(JSON.stringify(message));
  },

  setEntities: (entities) => set({ entities }),
  updateEntity: (entity) => {
    const { entities } = get();
    const index = entities.findIndex((e) => e.entity_id === entity.entity_id);
    if (index >= 0) {
      const newEntities = [...entities];
      newEntities[index] = entity;
      set({ entities: newEntities });
    } else {
      set({ entities: [...entities, entity] });
    }
  },
  setAreas: (areas) => set({ areas }),
  setFloors: (floors) => set({ floors }),
  setDevices: (devices) => set({ devices }),
  setEntityRegistry: (entityRegistry) => set({ entityRegistry }),
}));

// Handler pour les messages WebSocket
function handleMessage(
  message: any,
  ws: WebSocket,
  token: string,
  set: any,
  get: any,
  resolveConnect: () => void,
) {
  switch (message.type) {
    case 'auth_required':
      // Envoyer le token d'authentification
      ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      break;

    case 'auth_ok':
      console.log('[HA] Authenticated');
      set({ isConnected: true, isConnecting: false });
      // Souscrire aux evenements
      subscribeToEvents(ws, get);
      // Charger les donnees initiales
      fetchInitialData(ws, get);
      resolveConnect();
      break;

    case 'auth_invalid':
      console.error('[HA] Auth invalid');
      set({ isConnecting: false, error: 'Token invalide' });
      break;

    case 'event':
      if (message.event?.event_type === 'state_changed') {
        const newState = message.event.data?.new_state;
        if (newState) {
          get().updateEntity(newState);
        }
      }
      break;

    case 'result':
      handleResult(message, set, get);
      break;
  }
}

function subscribeToEvents(ws: WebSocket, get: any) {
  const { messageId } = get();
  ws.send(
    JSON.stringify({
      id: messageId,
      type: 'subscribe_events',
      event_type: 'state_changed',
    }),
  );
  get().messageId++;
}

function fetchInitialData(ws: WebSocket, get: any) {
  let { messageId } = get();

  // Fetch states
  ws.send(JSON.stringify({ id: messageId++, type: 'get_states' }));
  // Fetch areas
  ws.send(JSON.stringify({ id: messageId++, type: 'config/area_registry/list' }));
  // Fetch floors
  ws.send(JSON.stringify({ id: messageId++, type: 'config/floor_registry/list' }));
  // Fetch devices
  ws.send(JSON.stringify({ id: messageId++, type: 'config/device_registry/list' }));
  // Fetch entity registry
  ws.send(JSON.stringify({ id: messageId++, type: 'config/entity_registry/list' }));

  get().messageId = messageId;
}

function handleResult(message: any, set: any, get: any) {
  if (!message.success) {
    console.error('[HA] Request failed', message.error);
    return;
  }

  const result = message.result;
  if (!result) return;

  // Determiner le type de resultat
  if (Array.isArray(result)) {
    if (result.length === 0) return;

    const firstItem = result[0];
    if (firstItem.entity_id && firstItem.state !== undefined) {
      // States
      set({ entities: result });
    } else if (firstItem.area_id && firstItem.name) {
      // Areas
      set({ areas: result });
    } else if (firstItem.floor_id) {
      // Floors
      set({ floors: result });
    } else if (firstItem.id && firstItem.name && !firstItem.entity_id) {
      // Devices
      set({ devices: result });
    } else if (firstItem.entity_id && !firstItem.state) {
      // Entity registry
      set({ entityRegistry: result });
    }
  }
}
