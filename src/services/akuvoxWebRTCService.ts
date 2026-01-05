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

  /** Activer l'audio bidirectionnel (envoyer le micro vers l'Akuvox) */
  enableMicrophone?: boolean;
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
  private localStream: MediaStream | null = null; // Stream audio local (micro)

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

      // Capturer le micro si l'audio bidirectionnel est activé
      if (config.enableMicrophone) {
        await this.captureMicrophone();
      }

      // Ajouter des transceivers
      // Vidéo : recvonly (on ne veut pas envoyer de vidéo)
      this.pc.addTransceiver('video', { direction: 'recvonly' });

      // Audio : sendrecv si micro activé, sinon recvonly
      if (config.enableMicrophone && this.localStream) {
        // Ajouter le track audio local à la connexion
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          this.pc.addTransceiver(audioTrack, { direction: 'sendrecv' });
          console.log('🎤 Microphone enabled (sendrecv)');
        } else {
          this.pc.addTransceiver('audio', { direction: 'recvonly' });
          console.warn('⚠️ No audio track found, falling back to recvonly');
        }
      } else {
        this.pc.addTransceiver('audio', { direction: 'recvonly' });
        console.log('🔇 Microphone disabled (recvonly)');
      }

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
   * Active ou désactive le micro
   */
  setMicrophoneEnabled(enabled: boolean): void {
    if (!this.localStream) {
      console.warn('⚠️ No local stream available');
      return;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
      console.log(enabled ? '🎤 Microphone unmuted' : '🔇 Microphone muted');
    }
  }

  /**
   * Vérifie si le micro est activé
   */
  isMicrophoneEnabled(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack?.enabled ?? false;
  }

  /**
   * Obtient le stream local (micro)
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Crée la RTCPeerConnection avec la bonne configuration ICE
   */
  private createPeerConnection(config: AkuvoxWebRTCConfig): RTCPeerConnection {
    const iceServers: RTCIceServer[] = [
      // STUN server pour P2P en local (tous les modes)
      { urls: 'stun:stun.l.google.com:19302' },
    ];

    // Ajouter TURN en fallback pour mobile/tablet
    if (config.mode === 'mobile' && config.turnConfig) {
      iceServers.push({
        urls: config.turnConfig.url,
        username: config.turnConfig.username,
        credential: config.turnConfig.credential,
      });
      console.log('🌐 TURN server available for fallback (mobile/tablet mode)');
    } else {
      console.log('🏠 Panel mode - P2P only');
    }

    return new RTCPeerConnection({
      iceServers,
      // Toujours essayer P2P d'abord, TURN en fallback si P2P échoue
      iceTransportPolicy: 'all',
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

      // Détecter les problèmes de connexion ICE
      if (state === 'disconnected') {
        console.warn('⚠️ ICE disconnected - connection may be unstable');
      }

      if (state === 'failed') {
        console.error('❌ ICE failed - connection cannot be established');
        this.callbacks.onError?.(new Error('ICE connection failed'));
      }
    };

    // Logger les ICE candidates (debug)
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate;
        console.log('🧊 ICE candidate:', candidate);

        // Identifier le type de candidate (host, srflx, relay)
        if (candidate.includes('typ host')) {
          console.log('  → Type: HOST (direct local)');
        } else if (candidate.includes('typ srflx')) {
          console.log('  → Type: SRFLX (STUN reflexive)');
        } else if (candidate.includes('typ relay')) {
          console.log('  → Type: RELAY (TURN relay) ✅');
        }
      } else {
        console.log('🧊 ICE gathering complete');
      }
    };

    // Logger les erreurs ICE candidates
    this.pc.onicecandidateerror = (event) => {
      console.error('❌ ICE candidate error:', event);
    };
  }

  /**
   * Capture le micro de l'utilisateur
   */
  private async captureMicrophone(): Promise<void> {
    try {
      console.log('🎤 Requesting microphone access...');

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,  // Annulation d'écho
          noiseSuppression: true,  // Suppression du bruit
          autoGainControl: true,   // Contrôle automatique du gain
        },
        video: false,
      });

      console.log('✅ Microphone captured successfully');
    } catch (error) {
      console.error('❌ Failed to capture microphone:', error);

      // Si l'utilisateur refuse l'accès, continuer sans micro
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('⚠️ Microphone permission denied by user');
      }

      throw error;
    }
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    // Arrêter les tracks audio locaux
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped local audio track');
      });
      this.localStream = null;
    }

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
