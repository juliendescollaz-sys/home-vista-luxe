import JsSIP from 'jssip';

// JsSIP RTCSession type - using 'any' as JsSIP types are not properly exported
type RTCSessionType = any;

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

export type CallEventHandler = (call: RTCSessionType) => void;

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
  private currentSession: RTCSessionType | null = null;
  private onIncomingCallHandler: CallEventHandler | null = null;
  private connectionState: SIPConnectionState = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentConfig: SIPConfig | null = null;

  /**
   * Génère ou récupère un instance_id persistant pour cet appareil.
   * Cela garantit que le même appareil utilise toujours le même identifiant SIP,
   * évitant ainsi les enregistrements multiples sur Kamailio.
   */
  private getInstanceId(): string {
    const STORAGE_KEY = 'sip_instance_id';
    let instanceId = localStorage.getItem(STORAGE_KEY);

    if (!instanceId) {
      // Générer un UUID v4 unique pour cet appareil
      instanceId = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, instanceId);
      console.log('🆔 Generated new SIP instance ID:', instanceId);
    } else {
      // Migrer les anciens formats (urn:uuid:xxx -> xxx)
      if (instanceId.startsWith('urn:uuid:')) {
        instanceId = instanceId.replace('urn:uuid:', '');
        localStorage.setItem(STORAGE_KEY, instanceId);
        console.log('🆔 Migrated SIP instance ID:', instanceId);
      } else {
        console.log('🆔 Using existing SIP instance ID:', instanceId);
      }
    }

    return instanceId;
  }

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

    // Récupérer l'instance_id persistant pour cet appareil
    const instanceId = this.getInstanceId();

    const configuration = {
      sockets: [socket],
      uri: sipConfig.uri,
      password: sipConfig.password,
      display_name: sipConfig.displayName || 'Neolia App',
      session_timers: false,
      // Instance ID persistant : garantit que le même appareil = même enregistrement SIP
      // Évite les enregistrements multiples sur Kamailio
      instance_id: instanceId,
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
      const session: RTCSessionType = data.session;

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
  private setupSessionListeners(session: RTCSessionType) {
    session.on('connecting', () => {
      console.log('📞 Call connecting...');
    });

    session.on('progress', (e: any) => {
      console.log('📞 Call progress:', e);
    });

    session.on('accepted', () => {
      console.log('✅ Call accepted');
    });

    session.on('confirmed', () => {
      console.log('✅ Call confirmed (bidirectional audio established)');
    });

    session.on('ended', (e: any) => {
      console.log('📴 Call ended:', {
        originator: e.originator,
        cause: e.cause,
        message: e.message,
      });
      this.currentSession = null;
      // Note: pas besoin de ré-enregistrer manuellement, JsSIP gère ça automatiquement
      // avec l'instance_id persistant qui garantit le même enregistrement
    });

    session.on('failed', (e: any) => {
      console.error('❌ Call failed - originator:', e.originator);
      console.error('❌ Call failed - cause:', e.cause);
      console.error('❌ Call failed - message:', e.message?.status_code, e.message?.reason_phrase);
      if (e.message) {
        console.error('❌ Call failed - full message:', JSON.stringify(e.message, null, 2));
      }
      this.currentSession = null;
      // Note: pas besoin de ré-enregistrer manuellement, JsSIP gère ça automatiquement
      // avec l'instance_id persistant qui garantit le même enregistrement
    });

    // Événement crucial pour iOS : erreur getUserMedia
    session.on('getusermediafailed', (e: any) => {
      console.error('❌ getUserMedia failed:', e);
    });

    // Erreur lors de la création de l'answer SDP (crucial pour diagnostiquer iOS)
    session.on('createanswerfailed', (e: any) => {
      console.error('❌ createAnswer failed:', e);
      console.error('❌ createAnswer error name:', e?.name);
      console.error('❌ createAnswer error message:', e?.message);
    });

    // Erreur lors de la création de l'offer SDP
    session.on('createofferfailed', (e: any) => {
      console.error('❌ createOffer failed:', e);
    });

    // Événement quand le SDP est créé/reçu
    // IMPORTANT: On modifie le SDP remote (offer) pour désactiver la vidéo
    // Cela évite les problèmes de transceivers sur iOS Safari
    session.on('sdp', (e: any) => {
      console.log('📝 SDP event:', e.type, e.originator);

      // Modifier l'offre entrante pour désactiver la vidéo AVANT setRemoteDescription
      // Cela permet à createAnswer de fonctionner sans track vidéo
      if (e.originator === 'remote' && e.type === 'offer') {
        console.log('📝 Modifying remote offer to disable video (port=0)...');
        const originalVideoPort = e.sdp.match(/m=video (\d+)/)?.[1];
        if (originalVideoPort && originalVideoPort !== '0') {
          e.sdp = e.sdp.replace(/m=video \d+/g, 'm=video 0');
          console.log('📝 Video port changed from', originalVideoPort, 'to 0');
        }
      }

      // Log le SDP pour debug
      if (e.sdp) {
        console.log('📝 SDP content (first 500 chars):', e.sdp.substring(0, 500));
      }
    });

    // Événement ICE gathering
    session.on('icecandidate', (e: any) => {
      console.log('🧊 SIP ICE candidate event:', e.candidate?.candidate);
    });

    session.on('peerconnection', (e: any) => {
      console.log('🔗 WebRTC PeerConnection established');

      const pc: RTCPeerConnection = e.peerconnection;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate:', event.candidate.candidate);
        } else {
          console.log('🧊 ICE gathering complete');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
      };

      pc.onsignalingstatechange = () => {
        console.log('📡 Signaling state:', pc.signalingState);
      };
    });
  }

  /**
   * Répond à un appel entrant
   * @param preAcquiredStream - Stream audio déjà capturé (pour éviter les conflits iOS)
   */
  answer(preAcquiredStream?: MediaStream) {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to answer');
      return;
    }

    console.log('📞 Answering call...', preAcquiredStream ? '(with pre-acquired stream)' : '(will request mic)');

    // NOTE: La modification du SDP pour désactiver la vidéo est faite dans setupSessionListeners
    // via l'événement 'sdp' qui est déclenché AVANT setRemoteDescription

    const options: any = {
      pcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      },
    };

    // Spécifier les contraintes média : audio seulement
    // La vidéo de l'Akuvox sera gérée par le composant AkuvoxVideoStream via WHEP
    options.mediaConstraints = {
      audio: true,
      video: false,
    };

    // Si on a un stream pré-capturé, l'utiliser directement
    // Sinon, JsSIP demandera le micro (peut causer des problèmes sur iOS)
    if (preAcquiredStream) {
      options.mediaStream = preAcquiredStream;
      console.log('📞 Using pre-acquired audio stream with', preAcquiredStream.getAudioTracks().length, 'audio tracks');
    }

    console.log('📞 Answer options:', JSON.stringify({
      hasPreAcquiredStream: !!preAcquiredStream,
      mediaConstraints: options.mediaConstraints,
    }));

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
  getCurrentSession(): RTCSessionType | null {
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
