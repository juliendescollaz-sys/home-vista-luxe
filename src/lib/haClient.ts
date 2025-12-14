import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";
import { logger } from "./logger";

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
  private isReconnecting = false;

  constructor(private config: HAClientConfig) {
    if (!config.baseUrl || !config.token) {
      throw new Error("HAClient: baseUrl et token sont requis");
    }
    if (!config.baseUrl.includes("ui.nabu.casa")) {
      console.warn("HAClient: L'URL ne semble pas être une URL Nabu Casa");
    }
  }

  private get wsUrl(): string {
    const normalized = this.config.baseUrl.replace(/\/+$/, "");

    // Si c'est déjà une URL WebSocket, on ajoute simplement /api/websocket si nécessaire
    if (/^wss?:\/\//i.test(normalized)) {
      return normalized.endsWith("/api/websocket")
        ? normalized
        : `${normalized}/api/websocket`;
    }

    // HTTP(S) → WS(S)
    const isHttps = /^https:\/\//i.test(normalized);
    const scheme = isHttps ? "wss" : "ws";
    const wsBase = normalized.replace(/^https?:\/\//i, `${scheme}://`);

    return `${wsBase}/api/websocket`;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      logger.debug("🔌 Connexion WebSocket à:", this.wsUrl.replace(/:\d+/, ':****'));

      try {
        this.ws = new WebSocket(this.wsUrl);
      } catch (error) {
        logger.error("❌ Erreur création WebSocket:", error);
        reject(error);
        return;
      }

      const authTimeout = setTimeout(() => {
        if (!this.isAuthenticated) {
          logger.error("⏱️ Timeout d'authentification");
          this.ws?.close();
          reject(new Error("Timeout d'authentification"));
        }
      }, 15000);

      this.ws.onopen = () => {
        logger.debug("✅ WebSocket ouvert, attente de auth_required...");
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          logger.debug("📨 Message reçu:", message.type, message);

          if (message.type === "auth_required") {
            logger.debug("🔐 Auth requise, envoi du token...");
            this.send({ type: "auth", access_token: this.config.token });
          } else if (message.type === "auth_ok") {
            logger.info("✅ Authentification réussie!");
            this.isAuthenticated = true;
            this.reconnectAttempts = 0;
            clearTimeout(authTimeout);
            
            // Si c'est une reconnexion, émettre l'événement
            if (this.isReconnecting) {
              logger.info("🔄 Reconnexion réussie, émission de l'événement");
              this.isReconnecting = false;
              // Émettre après un court délai pour que resolve() soit appelé en premier
              setTimeout(() => this.handleEvent({ event_type: "reconnected", data: {} }), 0);
            }
            
            resolve(true);
          } else if (message.type === "auth_invalid") {
            logger.error("❌ Token invalide");
            clearTimeout(authTimeout);
            this.isAuthenticated = false;
            reject(new Error("Token d'authentification invalide"));
          } else if (message.id && this.pendingMessages.has(message.id)) {
            const { resolve: resolvePending, reject: rejectPending } = this.pendingMessages.get(message.id)!;
            this.pendingMessages.delete(message.id);

            if (message.success === false) {
              logger.error("❌ Erreur de la requête:", message.error);
              rejectPending(new Error(message.error?.message || "Erreur inconnue"));
            } else {
              resolvePending(message.result);
            }
          } else if (message.type === "event") {
            this.handleEvent(message.event);
          }
        } catch (error) {
          logger.error("❌ Erreur parsing message:", error, event.data);
        }
      };

      this.ws.onerror = (error) => {
        logger.error("❌ Erreur WebSocket:", error);
        clearTimeout(authTimeout);
        if (!this.isAuthenticated) {
          reject(error);
        }
      };

      this.ws.onclose = (event) => {
        logger.debug("🔌 WebSocket fermé:", event.code, event.reason);
        this.isAuthenticated = false;
        this.ws = null;

        // Tenter une reconnexion si ce n'était pas intentionnel
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          logger.info(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms...`);
          
          this.isReconnecting = true;
          this.reconnectTimeout = setTimeout(() => {
            this.connect().catch(logger.error);
          }, delay);
        }
      };
    });
  }

  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      logger.debug("📤 Message envoyé:", message.type || message.id);
    } else {
      const wsState = this.ws?.readyState;
      const stateLabel = wsState === WebSocket.CONNECTING ? 'CONNECTING' :
                         wsState === WebSocket.CLOSING ? 'CLOSING' :
                         wsState === WebSocket.CLOSED ? 'CLOSED' : 'NULL';
      console.error(`[Neolia] WebSocket non connecté (état: ${stateLabel}), impossible d'envoyer:`, message.type || message.id);
      throw new Error(`WebSocket non connecté (état: ${stateLabel})`);
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

  async updateAreaName(areaId: string, newName: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error("WebSocket Home Assistant non connecté");
    }

    console.info("[Neolia] updateAreaName →", { areaId, newName });

    await this.sendWithResponse("config/area_registry/update", {
      area_id: areaId,
      name: newName,
    });
  }

  async updateEntityName(entityId: string, newName: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error("WebSocket Home Assistant non connecté");
    }

    console.info("[Neolia] updateEntityName →", { entityId, newName });

    await this.sendWithResponse("config/entity_registry/update", {
      entity_id: entityId,
      name: newName,
    });
  }

  // Scene management methods using Edge Function proxy (avoids CORS issues)
  
  /**
   * Get scene configuration from Home Assistant
   * Returns the full scene config including entities and their target states
   */
  async getSceneConfig(sceneId: string): Promise<{
    id: string;
    name: string;
    entities: Record<string, any>;
    icon?: string;
  } | null> {
    console.info("[Neolia] getSceneConfig via Edge Function →", { sceneId });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-scene-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "get",
        sceneId: sceneId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] getSceneConfig error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur récupération scène: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle notFound response (scene exists in HA but not in config API)
    if (data.notFound) {
      console.warn("[Neolia] getSceneConfig: scene not found in config (legacy scene)");
      return null;
    }
    
    console.info("[Neolia] getSceneConfig success:", data);
    return data;
  }

  async createScene(config: {
    id: string;
    name: string;
    description?: string;
    entities: Record<string, any>;
    icon?: string;
  }): Promise<void> {
    console.info("[Neolia] createScene via Edge Function →", { id: config.id, name: config.name });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-scene-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "create",
        sceneId: config.id,
        sceneConfig: {
          name: config.name,
          description: config.description,
          entities: config.entities,
          icon: config.icon,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] createScene error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur création scène: ${response.status}`);
    }

    console.info("[Neolia] createScene success");
  }

  async updateHAScene(config: {
    id: string;
    name?: string;
    description?: string;
    entities?: Record<string, any>;
    icon?: string;
  }): Promise<void> {
    console.info("[Neolia] updateHAScene via Edge Function →", { id: config.id });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-scene-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "update",
        sceneId: config.id,
        sceneConfig: {
          name: config.name || "",
          description: config.description,
          entities: config.entities || {},
          icon: config.icon,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] updateHAScene error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur mise à jour scène: ${response.status}`);
    }

    console.info("[Neolia] updateHAScene success");
  }

  async deleteHAScene(sceneId: string): Promise<{ deleted: boolean; cannotDelete?: boolean; reason?: string }> {
    console.info("[Neolia] deleteHAScene via Edge Function →", { sceneId });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-scene-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "delete",
        sceneId: sceneId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] deleteHAScene error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur suppression scène: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle cannotDelete response (legacy HA scene)
    if (data.cannotDelete) {
      console.warn("[Neolia] deleteHAScene: scene cannot be deleted (legacy scene)");
      return { deleted: false, cannotDelete: true, reason: data.reason };
    }

    console.info("[Neolia] deleteHAScene success");
    return { deleted: true };
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: { entity_id?: string | string[]; area_id?: string | string[] }
  ): Promise<any> {
    const entityId = target?.entity_id;
    const wsUrl = this.wsUrl.replace(/access_token=[^&]+/, 'access_token=***');
    
    console.info("[Neolia] Appel service HA", {
      domain,
      service,
      entity_id: entityId,
      data: serviceData,
      wsUrl,
      isConnected: this.isConnected(),
      isAuthenticated: this.isAuthenticated,
    });

    // Vérifier l'état de la connexion avant d'envoyer
    if (!this.isConnected()) {
      const error = new Error("WebSocket non connecté - impossible d'envoyer la commande");
      console.error("[Neolia] Service HA ERREUR - WebSocket non connecté", {
        entity_id: entityId,
        service,
        wsState: this.ws?.readyState,
        isAuthenticated: this.isAuthenticated,
      });
      throw error;
    }

    try {
      const response = await this.sendWithResponse("call_service", {
        domain,
        service,
        service_data: serviceData,
        target,
      });
      
      console.info("[Neolia] Service HA OK", {
        entity_id: entityId,
        service: `${domain}.${service}`,
        response,
      });
      
      return response;
    } catch (error) {
      console.error("[Neolia] Service HA ERREUR", {
        entity_id: entityId,
        service: `${domain}.${service}`,
        error: error instanceof Error ? error.message : error,
        errorFull: error,
      });
      throw error;
    }
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

  // Méthode publique pour s'abonner aux événements (conserve handlers entre reconnexions)
  on(eventType: string, callback: EventCallback): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(callback);
    
    // Si déjà connecté, s'abonner immédiatement
    if (this.isAuthenticated) {
      this.sendWithResponse("subscribe_events", { event_type: eventType })
        .catch(console.error);
    }
    
    return () => {
      this.eventHandlers.get(eventType)?.delete(callback);
    };
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

  // Automation management methods using Edge Function proxy
  async createAutomation(config: {
    id: string;
    alias: string;
    description?: string;
    trigger: any[];
    condition?: any[];
    action: any[];
    icon?: string;
  }): Promise<void> {
    console.info("[Neolia] createAutomation via Edge Function →", { id: config.id, alias: config.alias });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-automation-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "create",
        automationId: config.id,
        automationConfig: {
          alias: config.alias,
          description: config.description,
          trigger: config.trigger,
          condition: config.condition,
          action: config.action,
          icon: config.icon,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] createAutomation error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur création automation: ${response.status}`);
    }

    console.info("[Neolia] createAutomation success");
  }

  async updateAutomation(config: {
    id: string;
    alias?: string;
    description?: string;
    trigger?: any[];
    condition?: any[];
    action?: any[];
    icon?: string;
  }): Promise<void> {
    console.info("[Neolia] updateAutomation via Edge Function →", { id: config.id });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-automation-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "update",
        automationId: config.id,
        automationConfig: {
          alias: config.alias,
          description: config.description,
          trigger: config.trigger,
          condition: config.condition,
          action: config.action,
          icon: config.icon,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] updateAutomation error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur mise à jour automation: ${response.status}`);
    }

    console.info("[Neolia] updateAutomation success");
  }

  async deleteAutomation(automationId: string): Promise<{ deleted: boolean; cannotDelete?: boolean; reason?: string }> {
    console.info("[Neolia] deleteAutomation via Edge Function →", { automationId });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-automation-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "delete",
        automationId: automationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] deleteAutomation error:", response.status, errorData);
      throw new Error(errorData.details || errorData.error || `Erreur suppression automation: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.cannotDelete) {
      console.warn("[Neolia] deleteAutomation: automation cannot be deleted (legacy)");
      return { deleted: false, cannotDelete: true, reason: data.reason };
    }

    console.info("[Neolia] deleteAutomation success");
    return { deleted: true };
  }

  async getAutomationConfig(automationId: string): Promise<{ notFound?: boolean; config?: any }> {
    console.info("[Neolia] getAutomationConfig via Edge Function →", { automationId });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/ha-automation-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        haBaseUrl: this.config.baseUrl,
        haToken: this.config.token,
        action: "get",
        automationId: automationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Neolia] getAutomationConfig error:", response.status, errorData);
      return { notFound: true };
    }

    const data = await response.json();
    
    if (data.notFound) {
      console.info("[Neolia] getAutomationConfig: automation not found (legacy)");
      return { notFound: true };
    }

    console.info("[Neolia] getAutomationConfig success:", data);
    return { config: data };
  }

  // REST API methods (use WebSocket instead for Nabu Casa compatibility)
  async getConfig(): Promise<any> {
    console.log("🔧 Récupération de la configuration via WebSocket...");
    return this.sendWithResponse<any>("get_config");
  }

  async getStatesREST(): Promise<any[]> {
    const url = `${this.config.baseUrl}/api/states`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.config.token}` },
    });
    if (!res.ok) throw new Error(`GET /api/states failed: ${res.status}`);
    return res.json();
  }

  async getState(entityId: string): Promise<any> {
    const url = `${this.config.baseUrl}/api/states/${entityId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.config.token}` },
    });
    if (!res.ok) throw new Error(`GET /api/states/${entityId} failed: ${res.status}`);
    return res.json();
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
