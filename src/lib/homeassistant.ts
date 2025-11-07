import type { HAConnection, HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

export class HomeAssistantAPI {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private pendingMessages = new Map<number, (response: any) => void>();
  private eventHandlers = new Map<string, Set<(data: any) => void>>();

  constructor(private connection: HAConnection) {}

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.connection.url.replace(/^http/, "ws") + "/api/websocket";
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected to Home Assistant");
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === "auth_required") {
          this.send({ type: "auth", access_token: this.connection.token });
        } else if (message.type === "auth_ok") {
          console.log("Authenticated with Home Assistant");
          resolve(true);
        } else if (message.type === "auth_invalid") {
          console.error("Authentication failed");
          reject(new Error("Authentication failed"));
        } else if (message.id && this.pendingMessages.has(message.id)) {
          const handler = this.pendingMessages.get(message.id);
          this.pendingMessages.delete(message.id);
          handler?.(message);
        } else if (message.type === "event") {
          this.handleEvent(message.event);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.ws = null;
      };
    });
  }

  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private async sendWithResponse<T>(type: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingMessages.set(id, (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error?.message || "Unknown error"));
        }
      });

      this.send({ id, type, ...data });
    });
  }

  async getStates(): Promise<HAEntity[]> {
    return this.sendWithResponse<HAEntity[]>("get_states");
  }

  async getAreas(): Promise<HAArea[]> {
    return this.sendWithResponse<HAArea[]>("config/area_registry/list");
  }

  async getFloors(): Promise<HAFloor[]> {
    return this.sendWithResponse<HAFloor[]>("config/floor_registry/list");
  }

  async callService(domain: string, service: string, data?: any): Promise<void> {
    await this.sendWithResponse("call_service", {
      domain,
      service,
      service_data: data,
    });
  }

  subscribeEvents(eventType: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
      this.sendWithResponse("subscribe_events", { event_type: eventType });
    }
    this.eventHandlers.get(eventType)?.add(handler);
  }

  unsubscribeEvents(eventType: string, handler: (data: any) => void) {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  private handleEvent(event: any) {
    const handlers = this.eventHandlers.get(event.event_type);
    handlers?.forEach((handler) => handler(event.data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// REST API fallback
export async function fetchHA<T>(
  connection: HAConnection,
  endpoint: string
): Promise<T> {
  const response = await fetch(`${connection.url}/api/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${connection.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HA API error: ${response.statusText}`);
  }

  return response.json();
}

export async function testConnection(url: string, token: string): Promise<boolean> {
  try {
    console.log("Testing connection to:", url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${url}/api/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log("Connection response status:", response.status);
    
    if (!response.ok) {
      console.error("Connection failed with status:", response.status);
      return false;
    }
    
    const data = await response.json();
    console.log("Connection successful:", data);
    return true;
  } catch (error) {
    console.error("Connection error:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
      });
    }
    return false;
  }
}
