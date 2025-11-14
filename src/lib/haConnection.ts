// src/lib/haConnection.ts
import {
  createConnection,
  subscribeEntities,
  callService,
} from "home-assistant-js-websocket";

let connection: any = null;
let entityCache: Record<string, any> = {};
let listeners: ((entities: Record<string, any>) => void)[] = [];

/**
 * Initialise la connexion WebSocket Home Assistant.
 * Cette méthode utilise le reconnect natif de HA.
 */
export async function initHAConnection(haUrl: string, token: string) {
  connection = await createConnection({
    auth: {
      accessToken: token,
      expired: false,
      refreshToken: token,
      clientId: null,
      hassUrl: haUrl,
    } as any,
  });

  // Mise à jour des entités en temps réel
  subscribeEntities(connection, (entities) => {
    entityCache = entities;
    listeners.forEach((cb) => cb(entityCache));
  });

  return connection;
}

/** Retourne la connexion Home Assistant */
export function getHAConnection() {
  return connection;
}

/** Retourne toutes les entités HA */
export function getEntities() {
  return entityCache;
}

/** Souscription aux entités */
export function onEntitiesUpdate(
  cb: (entities: Record<string, any>) => void
) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

/** Appel de service HA simple */
export async function haCallService(
  domain: string,
  service: string,
  data: any
) {
  if (!connection) throw new Error("HA client not connected");
  return callService(connection, domain, service, data);
}
