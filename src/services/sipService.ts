import JsSIP from 'jssip';

/**
 * Service SIP pour gérer les appels audio bidirectionnels
 *
 * Architecture :
 * - Connexion WebSocket (WSS) vers Kamailio VPS
 * - Audio bidirectionnel via WebRTC (SIP over WebSocket)
 * - Utilisé en parallèle avec AkuvoxVideoStream pour la vidéo
 *
 * Flux d'un appel entrant :
 * 1. Akuvox E12W appuie sur le bouton d'appel
 * 2. Kamailio VPS route l'appel vers l'utilisateur (iPhone/Panel)
 * 3. JsSIP déclenche l'événement 'newRTCSession'
 * 4. L'app affiche l'UI d'appel entrant
 * 5. L'utilisateur accepte → audio bidirectionnel établi
 */

export type CallEventHandler = (call: JsSIP.RTCSession) => void;

export interface SIPConfig {
  /** URI SIP de l'utilisateur (ex: sip:julien@neolia-sip.com) */
  uri: string;

  /** Mot de passe SIP */
  password: string;

  /** URL WebSocket du serveur Kamailio (ex: wss://neolia-sip.com:443) */
  wsServers: string;

  /** Nom affiché lors des appels */
  displayName?: string;
}

export type SIPConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'registered'
  | 'error';

export class SIPService {
  private ua: JsSIP.UA | null = null;
  private currentSession: JsSIP.RTCSession | null = null;
  private onIncomingCallHandler: CallEventHandler | null = null;
  private connectionState: SIPConnectionState = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentConfig: SIPConfig | null = null;

  /**
   * Initialise la connexion SIP
   */
  init(sipConfig: SIPConfig) {
    console.log('🔌 Initializing SIP service with config:', {
      uri: sipConfig.uri,
      wsServers: sipConfig.wsServers,
      displayName: sipConfig.displayName,
    });

    // Sauvegarder la config pour reconnexion
    this.currentConfig = sipConfig;

    // Nettoyer une éventuelle connexion existante
    this.disconnect();

    // Créer le socket WebSocket
    const socket = new JsSIP.WebSocketInterface(sipConfig.wsServers);

    const configuration = {
      sockets: [socket],
      uri: sipConfig.uri,
      password: sipConfig.password,
      display_name: sipConfig.displayName || 'Neolia App',
      session_timers: false,
      // Configuration pour améliorer la stabilité
      register_expires: 600,
      no_answer_timeout: 60,
      connection_recovery_max_interval: 30,
      connection_recovery_min_interval: 2,
    };

    this.ua = new JsSIP.UA(configuration);
    this.setupEventListeners();

    // Démarrer l'UA
    this.ua.start();
    this.connectionState = 'connecting';
  }

  /**
   * Configure les event listeners JsSIP
   */
  private setupEventListeners() {
    if (!this.ua) return;

    // Connexion WebSocket établie
    this.ua.on('connected', () => {
      console.log('✅ SIP WebSocket connected');
      this.connectionState = 'connected';

      // Annuler le timer de reconnexion si actif
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    // Déconnexion WebSocket
    this.ua.on('disconnected', () => {
      console.log('❌ SIP WebSocket disconnected');
      this.connectionState = 'disconnected';

      // Tenter de se reconnecter après 5 secondes
      if (this.currentConfig && !this.reconnectTimer) {
        console.log('⏳ Reconnecting in 5 seconds...');
        this.reconnectTimer = setTimeout(() => {
          if (this.currentConfig) {
            this.init(this.currentConfig);
          }
        }, 5000);
      }
    });

    // Enregistrement SIP réussi
    this.ua.on('registered', (data: any) => {
      console.log('✅ SIP Registered:', data);
      this.connectionState = 'registered';
    });

    // Désenregistrement SIP
    this.ua.on('unregistered', () => {
      console.log('⚠️ SIP Unregistered');
      this.connectionState = 'connected';
    });

    // Échec d'enregistrement SIP
    this.ua.on('registrationFailed', (e: any) => {
      console.error('❌ SIP Registration Failed:', e);
      this.connectionState = 'error';
    });

    // Nouvel appel entrant ou sortant
    this.ua.on('newRTCSession', (data: any) => {
      const session: JsSIP.RTCSession = data.session;

      if (session.direction === 'incoming') {
        console.log('📞 Incoming SIP call from:', session.remote_identity.display_name || session.remote_identity.uri.user);
        this.currentSession = session;

        // Configurer les événements de la session
        this.setupSessionListeners(session);

        // Notifier l'application d'un appel entrant
        if (this.onIncomingCallHandler) {
          this.onIncomingCallHandler(session);
        }
      } else {
        console.log('📞 Outgoing SIP call to:', session.remote_identity.uri.user);
        this.currentSession = session;
        this.setupSessionListeners(session);
      }
    });
  }

  /**
   * Configure les event listeners pour une session d'appel
   */
  private setupSessionListeners(session: JsSIP.RTCSession) {
    session.on('connecting', () => {
      console.log('📞 Call connecting...');
    });

    session.on('accepted', () => {
      console.log('✅ Call accepted');
    });

    session.on('confirmed', () => {
      console.log('✅ Call confirmed (bidirectional audio established)');
    });

    session.on('ended', () => {
      console.log('📴 Call ended');
      this.currentSession = null;
    });

    session.on('failed', (e: any) => {
      console.error('❌ Call failed:', e);
      this.currentSession = null;
    });

    session.on('peerconnection', (e: any) => {
      console.log('🔗 WebRTC PeerConnection established');

      // Logger les ICE candidates pour debug
      const pc: RTCPeerConnection = e.peerconnection;
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate:', event.candidate.candidate);
        }
      };
    });
  }

  /**
   * Répond à un appel entrant
   */
  answer() {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to answer');
      return;
    }

    console.log('📞 Answering call...');

    const options = {
      mediaConstraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      },
      pcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // TURN server si nécessaire (à configurer)
        ],
      },
    };

    this.currentSession.answer(options);
  }

  /**
   * Raccroche l'appel en cours
   */
  hangup() {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to hangup');
      return;
    }

    console.log('📴 Hanging up call...');
    this.currentSession.terminate();
    this.currentSession = null;
  }

  /**
   * Enregistre un callback pour les appels entrants
   */
  onIncomingCall(handler: CallEventHandler) {
    this.onIncomingCallHandler = handler;
  }

  /**
   * Obtient l'état de la connexion SIP
   */
  getConnectionState(): SIPConnectionState {
    return this.connectionState;
  }

  /**
   * Vérifie si le service est enregistré et prêt
   */
  isRegistered(): boolean {
    return this.connectionState === 'registered';
  }

  /**
   * Obtient la session d'appel actuelle
   */
  getCurrentSession(): JsSIP.RTCSession | null {
    return this.currentSession;
  }

  /**
   * Déconnecte le service SIP
   */
  disconnect() {
    console.log('🔌 Disconnecting SIP service...');

    // Annuler le timer de reconnexion
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Terminer l'appel en cours si actif
    if (this.currentSession) {
      this.currentSession.terminate();
      this.currentSession = null;
    }

    // Arrêter l'UA
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }

    this.connectionState = 'disconnected';
    this.currentConfig = null;
  }
}

export const sipService = new SIPService();
