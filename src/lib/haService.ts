// src/lib/haService.ts
import { haCallService, getHAConnection } from "./haConnection";

/**
 * Fonction universelle pour appeler un service HA.
 * Ultra simple, propre, stable.
 */
export async function callHAService(
  domain: string,
  service: string,
  data: any
) {
  const conn = getHAConnection();
  if (!conn) throw new Error("Client HA non connecté");

  try {
    await haCallService(domain, service, data);
  } catch (err) {
    console.error("Erreur service HA:", err);
    throw new Error("Erreur Home Assistant");
  }
}
