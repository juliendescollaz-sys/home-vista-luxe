import { IntercomCall } from '@/types/intercom';

type WebSocketMessageHandler = (call: IntercomCall) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandler: WebSocketMessageHandler | null = null;
  private url: string;

  constructor() {
    this.url = 'wss://api.sip.neolia.ch/ws/intercom';
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket:', this.url);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data);

        if (data.type === 'incoming_call' && this.messageHandler) {
          this.messageHandler(data.call);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 5s...');
      this.ws = null;
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, 5000);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onIncomingCall(handler: WebSocketMessageHandler) {
    this.messageHandler = handler;
  }
}

export const websocketService = new WebSocketService();
