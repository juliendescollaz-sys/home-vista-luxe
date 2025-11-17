import { Capacitor } from '@capacitor/core';

/**
 * QR Code parsing and validation for Home Assistant pairing
 * Supports two JSON formats:
 * - Variant A: { "ha_url": "...", "ha_token": "..." }
 * - Variant B: { "url": "...", "access_token": "..." }
 */

export interface ParsedQRData {
  baseUrl: string;
  token: string;
  wsUrl: string;
}

type QRPayloadA = { ha_url: string; ha_token: string };
type QRPayloadB = { url: string; access_token: string };

/**
 * Normalize base URL by removing trailing slashes
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Convert HTTP(S) URL to WebSocket endpoint
 */
function toWebSocketEndpoint(url: string): string {
  const normalized = normalizeBaseUrl(url);
  
  // Validate URL scheme
  if (!/^https?:\/\//i.test(normalized) && !/^wss?:\/\//i.test(normalized)) {
    throw new Error("URL HA invalide : utilisez http(s):// ou ws(s)://");
  }

  // Check if it's a Nabu Casa domain
  let hostname: string;
  try {
    const urlObj = new URL(normalized);
    hostname = urlObj.hostname;
  } catch {
    throw new Error("URL HA invalide : format incorrect");
  }

  const isNabuCasa = /\.ui\.nabu\.casa$/i.test(hostname);

  // If already a WebSocket URL
  if (/^wss?:\/\//i.test(normalized)) {
    // Nabu Casa must use secure WebSocket
    if (isNabuCasa && !/^wss:\/\//i.test(normalized)) {
      throw new Error("Nabu Casa requiert wss:// (sécurisé).");
    }
    return normalized; // Already WebSocket, return as-is
  }

  // Convert HTTP(S) to WS(S) + /api/websocket
  const isHttps = /^https:\/\//i.test(normalized);
  const scheme = isHttps ? "wss" : "ws";
  const wsBase = normalized.replace(/^https?:\/\//i, `${scheme}://`);
  
  return `${wsBase}/api/websocket`;
}

/**
 * Parse and validate QR code JSON data
 * @throws Error with specific message if validation fails
 */
export function parseQRCode(rawQR: string): ParsedQRData {
  // Parse JSON
  let data: any;
  try {
    data = JSON.parse(rawQR);
  } catch {
    throw new Error("QR invalide : contenu non JSON.");
  }

  // Extract URL and token (support both variants)
  const baseUrl = (data.ha_url ?? data.url)?.toString();
  const token = (data.ha_token ?? data.access_token)?.toString();

  // Validate required fields
  if (!baseUrl || !token) {
    throw new Error("QR incomplet : URL ou token manquant.");
  }

  // Validate token format (optional: basic JWT check)
  if (!token.trim()) {
    throw new Error("Token invalide : le token ne peut pas être vide.");
  }

  // Build WebSocket URL
  const wsUrl = toWebSocketEndpoint(baseUrl);
  
  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    token: token.trim(),
    wsUrl,
  };
}

/**
 * Check if HTTP URL should be blocked based on platform
 */
function shouldBlockHttpUrl(wsUrl: string): boolean {
  const isNative = Capacitor.getPlatform() !== 'web';
  const isHttp = wsUrl.startsWith('ws://');
  
  // En web (PWA en HTTPS) : on bloque le HTTP
  if (!isNative && window.location.protocol === 'https:' && isHttp) {
    return true;
  }
  
  // En natif (Android / iOS) : on autorise le HTTP local
  return false;
}

/**
 * Test Home Assistant connection via WebSocket
 * @returns Promise that resolves on success or rejects with specific error message
 */
export async function testHAConnection(wsUrl: string, token: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let ws: WebSocket | null = null;

    const cleanup = () => {
      if (ws) {
        try {
          ws.close();
        } catch {}
        ws = null;
      }
    };

    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      fail("Serveur injoignable");
    }, 10000);

    console.log("HA test connection start", {
      platform: Capacitor.getPlatform(),
      wsUrl,
    });

    try {
      const blocked = shouldBlockHttpUrl(wsUrl);
      console.log('HA connection', {
        platform: Capacitor.getPlatform(),
        wsUrl,
        blocked,
      });
      
      // Vérifier si on doit bloquer la connexion HTTP (web uniquement)
      if (blocked) {
        clearTimeout(timeout);
        fail("Connexion bloquée : utilisez HTTPS pour votre Home Assistant (ou accédez à l'app via HTTP)");
        return;
      }
      
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error("WebSocket construction failed", { wsUrl, error });
      clearTimeout(timeout);
      fail(error instanceof Error ? error.message : "Impossible de créer la connexion WebSocket");
      return;
    }

    ws.onopen = () => {
      console.log("✅ WebSocket ouvert, attente de auth_required...");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("📨 Message reçu:", msg.type);

        if (msg.type === "auth_required") {
          console.log("🔐 Envoi du token d'authentification...");
          ws?.send(JSON.stringify({ type: "auth", access_token: token }));
        } else if (msg.type === "auth_ok") {
          console.log("✅ Authentification réussie!");
          clearTimeout(timeout);
          cleanup();
          resolve();
        } else if (msg.type === "auth_invalid") {
          console.error("❌ Token refusé");
          clearTimeout(timeout);
          fail("Token invalide");
        }
      } catch (error) {
        console.error("❌ Erreur parsing message:", error);
        // Ignore malformed messages, continue waiting
      }
    };

    ws.onerror = (error) => {
      console.error("HA WS onerror", { wsUrl, error });
      clearTimeout(timeout);
      fail("Serveur injoignable");
    };

    ws.onclose = (event) => {
      console.log("HA WS onclose", { wsUrl, code: event.code, reason: event.reason });
      // Only fail if not already resolved/rejected
      if (timeout) {
        clearTimeout(timeout);
        fail("Connexion fermée par le serveur");
      }
    };
  });
}
