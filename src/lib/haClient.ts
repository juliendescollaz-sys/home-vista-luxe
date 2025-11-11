import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface HAClientConfig {
  baseUrl: string;
  token: string;
}

type EventCallback = (data: any) => void;

export class HAClient {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private pendingMessages = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  private eventHandlers = new Map<string, Set<EventCallback>>();
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private config: HAClientConfig) {
    if (!config.baseUrl || !config.token) {
      throw new Error("HAClient: baseUrl et token sont requis");
    }
    if (!config.baseUrl.includes("ui.nabu.casa")) {
      console.warn("HAClient: L'URL ne semble pas être une URL Nabu Casa");
    }
  }

  private get wsUrl(): string {
    return this.config.baseUrl.replace(/^https?/, "wss") + "/api/websocket";
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log("🔌 Connexion WebSocket à:", this.wsUrl);

      try {
        this.ws = new WebSocket(this.wsUrl);
      } catch (error) {
        console.error("❌ Erreur création WebSocket:", error);
        reject(error);
        return;
      }

      const authTimeout = setTimeout(() => {
        if (!this.isAuthenticated) {
          console.error("⏱️ Timeout d'authentification");
          this.ws?.close();
          reject(new Error("Timeout d'authentification"));
        }
      }, 15000);

      this.ws.onopen = () => {
        console.log("✅ WebSocket ouvert, attente de auth_required...");
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("📨 Message reçu:", message.type, message);

          if (message.type === "auth_required") {
            console.log("🔐 Auth requise, envoi du token...");
            this.send({ type: "auth", access_token: this.config.token });
          } else if (message.type === "auth_ok") {
            console.log("✅ Authentification réussie!");
            this.isAuthenticated = true;
            this.reconnectAttempts = 0;
            clearTimeout(authTimeout);
            resolve(true);
          } else if (message.type === "auth_invalid") {
            console.error("❌ Token invalide");
            clearTimeout(authTimeout);
            this.isAuthenticated = false;
            reject(new Error("Token d'authentification invalide"));
          } else if (message.id && this.pendingMessages.has(message.id)) {
            const { resolve: resolvePending, reject: rejectPending } = this.pendingMessages.get(message.id)!;
            this.pendingMessages.delete(message.id);

            if (message.success === false) {
              console.error("❌ Erreur de la requête:", message.error);
              rejectPending(new Error(message.error?.message || "Erreur inconnue"));
            } else {
              resolvePending(message.result);
            }
          } else if (message.type === "event") {
            this.handleEvent(message.event);
          }
        } catch (error) {
          console.error("❌ Erreur parsing message:", error, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ Erreur WebSocket:", error);
        clearTimeout(authTimeout);
        if (!this.isAuthenticated) {
          reject(error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("🔌 WebSocket fermé:", event.code, event.reason);
        this.isAuthenticated = false;
        this.ws = null;

        // Tenter une reconnexion si ce n'était pas intentionnel
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect().catch(console.error);
          }, delay);
        }
      };
    });
  }

  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log("📤 Message envoyé:", message.type || message.id);
    } else {
      console.error("❌ WebSocket non connecté, impossible d'envoyer:", message);
      throw new Error("WebSocket non connecté");
    }
  }

  private async sendWithResponse<T>(type: string, data?: any): Promise<T> {
    if (!this.isAuthenticated) {
      throw new Error("Non authentifié");
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error(`Timeout de la requête ${type}`));
      }, 30000);

      this.pendingMessages.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.send({ id, type, ...data });
    });
  }

  async getStates(): Promise<HAEntity[]> {
    console.log("📊 Récupération des états...");
    return this.sendWithResponse<HAEntity[]>("get_states");
  }

  async listAreas(): Promise<HAArea[]> {
    console.log("🏠 Récupération des pièces...");
    return this.sendWithResponse<HAArea[]>("config/area_registry/list");
  }

  async listFloors(): Promise<HAFloor[]> {
    console.log("🏢 Récupération des étages...");
    return this.sendWithResponse<HAFloor[]>("config/floor_registry/list");
  }

  async listDevices(): Promise<any[]> {
    console.log("📱 Récupération des appareils...");
    return this.sendWithResponse<any[]>("config/device_registry/list");
  }

  async listEntities(): Promise<any[]> {
    console.log("🎯 Récupération du registre des entités...");
    return this.sendWithResponse<any[]>("config/entity_registry/list");
  }

  async getServices(): Promise<any> {
    console.log("🔧 Récupération des services disponibles...");
    return this.sendWithResponse<any>("get_services");
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: { entity_id?: string | string[]; area_id?: string | string[] }
  ): Promise<void> {
    console.log(`🎬 Appel service: ${domain}.${service}`, { serviceData, target });
    
    await this.sendWithResponse("call_service", {
      domain,
      service,
      service_data: serviceData,
      target,
    });
  }

  subscribeStateChanges(callback: EventCallback): () => void {
    console.log("👂 Abonnement aux changements d'état...");
    
    if (!this.eventHandlers.has("state_changed")) {
      this.eventHandlers.set("state_changed", new Set());
      this.sendWithResponse("subscribe_events", { event_type: "state_changed" })
        .then(() => console.log("✅ Abonné aux changements d'état"))
        .catch(console.error);
    }

    this.eventHandlers.get("state_changed")!.add(callback);

    return () => {
      this.eventHandlers.get("state_changed")?.delete(callback);
    };
  }

  subscribeEvents(eventType: string, callback: EventCallback): () => void {
    console.log(`👂 Abonnement aux événements: ${eventType}`);
    
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
      this.sendWithResponse("subscribe_events", { event_type: eventType })
        .then(() => console.log(`✅ Abonné à ${eventType}`))
        .catch(console.error);
    }

    this.eventHandlers.get(eventType)!.add(callback);

    return () => {
      this.eventHandlers.get(eventType)?.delete(callback);
    };
  }

  async browseMedia(entityId: string, mediaContentId?: string, mediaContentType?: string): Promise<any> {
    console.log(`📂 Browse media pour ${entityId}`, { mediaContentId, mediaContentType });
    
    const data: any = { entity_id: entityId };
    
    // HA exige que media_content_type et media_content_id soient fournis ensemble
    // Si l'un est défini, l'autre doit l'être aussi (même si c'est une chaîne vide)
    const hasContentId = mediaContentId !== undefined;
    const hasContentType = mediaContentType !== undefined;
    
    if (hasContentId && hasContentType) {
      data.media_content_id = mediaContentId;
      data.media_content_type = mediaContentType;
    } else if (hasContentId || hasContentType) {
      // Si un seul est défini, envoyer les deux avec l'autre vide
      data.media_content_id = mediaContentId || "";
      data.media_content_type = mediaContentType || "";
    }
    // Sinon (aucun défini), ne rien ajouter = navigation racine

    console.log("📤 Payload browseMedia:", JSON.stringify(data));
    return this.sendWithResponse("media_player/browse_media", data);
  }

  async playMedia(entityId: string, mediaContentId: string, mediaContentType: string): Promise<void> {
    console.log(`▶️ Play media pour ${entityId}`, { mediaContentId, mediaContentType });
    
    await this.callService("media_player", "play_media", {
      media_content_id: mediaContentId,
      media_content_type: mediaContentType,
    }, { entity_id: entityId });
  }

  private handleEvent(event: any) {
    const handlers = this.eventHandlers.get(event.event_type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event.data);
        } catch (error) {
          console.error("❌ Erreur dans le handler d'événement:", error);
        }
      });
    }
  }

  disconnect() {
    console.log("🔌 Déconnexion...");
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Empêcher la reconnexion
    if (this.ws) {
      this.ws.close(1000, "Déconnexion intentionnelle");
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.pendingMessages.clear();
    this.eventHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  getSocket(): WebSocket | null {
    return this.ws;
  }
}

// Helper pour tester la connexion
export async function testNabucasaConnection(baseUrl: string, token: string): Promise<boolean> {
  const client = new HAClient({ baseUrl, token });
  
  try {
    await client.connect();
    console.log("✅ Test de connexion réussi");
    
    // Test basique: récupérer les états
    const states = await client.getStates();
    console.log(`✅ Récupéré ${states.length} entités`);
    
    client.disconnect();
    return true;
  } catch (error) {
    console.error("❌ Test de connexion échoué:", error);
    client.disconnect();
    return false;
  }
}
