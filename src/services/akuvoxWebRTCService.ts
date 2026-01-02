/**
 * Service WebRTC pour connexion WHEP vers MediaMTX (flux Akuvox)
 *
 * Architecture :
 * - Raspberry Pi : MediaMTX convertit RTSP (Akuvox) → WebRTC (WHEP endpoint)
 * - Panel (LAN) : Connexion directe sans TURN
 * - Mobile/Tablet (Remote) : Connexion via serveur TURN (VPS)
 *
 * Protocole WHEP :
 * 1. Créer RTCPeerConnection avec ICE servers appropriés
 * 2. Créer SDP offer
 * 3. POST offer au endpoint WHEP
 * 4. Recevoir SDP answer
 * 5. Établir connexion et recevoir le flux vidéo/audio
 */

export type ConnectionMode = 'panel' | 'mobile';

export interface AkuvoxWebRTCConfig {
  /** URL du endpoint WHEP MediaMTX (ex: http://192.168.1.115:8889/akuvox/whep) */
  whepUrl: string;

  /** Mode de connexion (panel = LAN direct, mobile = via TURN) */
  mode: ConnectionMode;

  /** Configuration TURN pour le mode mobile/tablet */
  turnConfig?: {
    url: string;      // ex: turn:141.227.158.64:3478
    username: string; // ex: neolia
    credential: string; // ex: Neolia022Turn
  };
}

export interface AkuvoxConnectionCallbacks {
  onTrack?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onError?: (error: Error) => void;
}

export class AkuvoxWebRTCService {
  private pc: RTCPeerConnection | null = null;
  private config: AkuvoxWebRTCConfig | null = null;
  private callbacks: AkuvoxConnectionCallbacks = {};

  /**
   * Démarre la connexion WebRTC vers le flux Akuvox
   */
  async connect(
    config: AkuvoxWebRTCConfig,
    callbacks: AkuvoxConnectionCallbacks = {}
  ): Promise<void> {
    this.config = config;
    this.callbacks = callbacks;

    try {
      // Créer RTCPeerConnection avec les bons ICE servers
      this.pc = this.createPeerConnection(config);

      // Setup event listeners
      this.setupEventListeners();

      // Ajouter des transceivers pour recevoir vidéo et audio
      this.pc.addTransceiver('video', { direction: 'recvonly' });
      this.pc.addTransceiver('audio', { direction: 'recvonly' });

      // Créer l'offer SDP
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      console.log('📤 Sending WHEP offer to:', config.whepUrl);

      // Envoyer l'offer au serveur WHEP et récupérer l'answer
      const response = await fetch(config.whepUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);
      }

      const answerSdp = await response.text();
      console.log('📥 Received WHEP answer');

      // Appliquer l'answer
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log('✅ WebRTC connection initiated');
    } catch (error) {
      console.error('❌ Failed to connect to Akuvox stream:', error);
      this.cleanup();

      const err = error instanceof Error ? error : new Error('Connection failed');
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Ferme la connexion WebRTC
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Akuvox stream');
    this.cleanup();
  }

  /**
   * Obtient l'état actuel de la connexion
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  /**
   * Obtient l'état ICE actuel
   */
  getIceConnectionState(): RTCIceConnectionState | null {
    return this.pc?.iceConnectionState ?? null;
  }

  /**
   * Crée la RTCPeerConnection avec la bonne configuration ICE
   */
  private createPeerConnection(config: AkuvoxWebRTCConfig): RTCPeerConnection {
    const iceServers: RTCIceServer[] = [];

    // Ajouter TURN en mode mobile/tablet
    if (config.mode === 'mobile' && config.turnConfig) {
      iceServers.push({
        urls: config.turnConfig.url,
        username: config.turnConfig.username,
        credential: config.turnConfig.credential,
      });
      console.log('🌐 Using TURN relay for remote connection (forced relay mode)');
    } else {
      // Mode Panel: STUN seulement
      iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
      console.log('🏠 Using direct LAN connection (Panel mode)');
    }

    return new RTCPeerConnection({
      iceServers,
      // Force relay mode en mobile pour passer par TURN
      iceTransportPolicy: config.mode === 'mobile' ? 'relay' : 'all',
    });
  }

  /**
   * Configure les event listeners sur la RTCPeerConnection
   */
  private setupEventListeners(): void {
    if (!this.pc) return;

    // Recevoir le flux audio/vidéo
    this.pc.ontrack = (event) => {
      console.log('📹 Track received:', event.track.kind);

      if (event.streams && event.streams[0]) {
        this.callbacks.onTrack?.(event.streams[0]);
      }
    };

    // Surveiller l'état de la connexion
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      console.log('🔗 Connection state:', state);

      if (state) {
        this.callbacks.onConnectionStateChange?.(state);
      }

      // Auto-cleanup si la connexion échoue ou se ferme
      if (state === 'failed' || state === 'closed') {
        this.cleanup();
      }
    };

    // Surveiller l'état ICE
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      console.log('🧊 ICE connection state:', state);

      if (state) {
        this.callbacks.onIceConnectionStateChange?.(state);
      }
    };

    // Logger les ICE candidates (debug)
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate:', event.candidate.candidate);
      }
    };

    // Logger les erreurs ICE candidates
    this.pc.onicecandidateerror = (event) => {
      console.error('❌ ICE candidate error:', event);
    };
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.config = null;
    this.callbacks = {};
  }
}

/**
 * Instance singleton du service (optionnel, peut être instancié par composant)
 */
export const akuvoxWebRTCService = new AkuvoxWebRTCService();
