import { Capacitor } from '@capacitor/core';
import LinphoneSip from '@/plugins/linphone-sip';

export type SipRegistrationState = 'disconnected' | 'registering' | 'registered' | 'failed';
export type SipCallState = 'none' | 'ringing' | 'incall' | 'ended';

export interface SipConfig {
  server: string;
  user: string;
  password: string;
  domain?: string;
  displayName?: string;
}

export interface IncomingCallInfo {
  from: string;
  displayName: string;
}

type SipEventCallback = {
  onIncomingCall?: (info: IncomingCallInfo) => void;
  onCallConnected?: () => void;
  onCallEnded?: (reason: string) => void;
  onRegistrationStateChanged?: (state: SipRegistrationState) => void;
  onError?: (error: string) => void;
};

/**
 * Service pour gérer le SIP natif via Linphone
 *
 * Usage :
 * ```ts
 * const sip = linphoneSipService;
 *
 * // Initialiser
 * await sip.initialize();
 *
 * // S'enregistrer
 * await sip.register({
 *   server: '192.168.1.115',
 *   user: 'panel-401',
 *   password: 'secretpassword'
 * });
 *
 * // Écouter les événements
 * sip.setCallbacks({
 *   onIncomingCall: (info) => {
 *     console.log('Appel de', info.displayName);
 *     // Afficher l'UI d'appel entrant
 *   },
 *   onCallConnected: () => {
 *     console.log('Appel connecté');
 *   },
 *   onCallEnded: (reason) => {
 *     console.log('Appel terminé:', reason);
 *   }
 * });
 *
 * // Répondre à un appel
 * await sip.answer();
 *
 * // Raccrocher
 * await sip.hangup();
 * ```
 */
class LinphoneSipService {
  private isInitialized = false;
  private isNative = false;
  private registrationState: SipRegistrationState = 'disconnected';
  private callState: SipCallState = 'none';
  private callbacks: SipEventCallback = {};
  private listenerHandles: Array<{ remove: () => void }> = [];

  constructor() {
    // Vérifier si on est sur Android natif
    this.isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Vérifie si le SIP natif est disponible
   */
  isAvailable(): boolean {
    return this.isNative;
  }

  /**
   * Initialise le SDK Linphone
   */
  async initialize(): Promise<boolean> {
    if (!this.isNative) {
      console.warn('[LinphoneSipService] SIP natif non disponible (pas sur Android)');
      return false;
    }

    if (this.isInitialized) {
      console.log('[LinphoneSipService] Déjà initialisé');
      return true;
    }

    try {
      const result = await LinphoneSip.initialize();
      if (result.success) {
        this.isInitialized = true;
        await this.setupListeners();
        console.log('[LinphoneSipService] Initialisé avec succès');
        return true;
      } else {
        console.error('[LinphoneSipService] Échec initialisation:', result.message);
        return false;
      }
    } catch (error) {
      console.error('[LinphoneSipService] Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Configure les listeners d'événements
   */
  private async setupListeners(): Promise<void> {
    // Appel entrant
    const incomingHandle = await LinphoneSip.addListener('incomingCall', (data) => {
      console.log('[LinphoneSipService] Appel entrant:', data);
      this.callState = 'ringing';
      this.callbacks.onIncomingCall?.({ from: data.from, displayName: data.displayName });
    });
    this.listenerHandles.push(incomingHandle);

    // Appel connecté
    const connectedHandle = await LinphoneSip.addListener('callConnected', () => {
      console.log('[LinphoneSipService] Appel connecté');
      this.callState = 'incall';
      this.callbacks.onCallConnected?.();
    });
    this.listenerHandles.push(connectedHandle);

    // Appel terminé
    const endedHandle = await LinphoneSip.addListener('callEnded', (data) => {
      console.log('[LinphoneSipService] Appel terminé:', data.reason);
      this.callState = 'ended';
      this.callbacks.onCallEnded?.(data.reason);
      // Reset après un court délai
      setTimeout(() => {
        this.callState = 'none';
      }, 500);
    });
    this.listenerHandles.push(endedHandle);

    // État d'enregistrement
    const regHandle = await LinphoneSip.addListener('registrationStateChanged', (data) => {
      console.log('[LinphoneSipService] État enregistrement:', data.state);
      switch (data.state) {
        case 'registered':
          this.registrationState = 'registered';
          break;
        case 'registering':
          this.registrationState = 'registering';
          break;
        case 'failed':
        case 'unregistered':
          this.registrationState = data.state === 'failed' ? 'failed' : 'disconnected';
          break;
        default:
          this.registrationState = 'disconnected';
      }
      this.callbacks.onRegistrationStateChanged?.(this.registrationState);
    });
    this.listenerHandles.push(regHandle);

    // Erreur
    const errorHandle = await LinphoneSip.addListener('error', (data) => {
      console.error('[LinphoneSipService] Erreur:', data.error);
      this.callbacks.onError?.(data.error);
    });
    this.listenerHandles.push(errorHandle);
  }

  /**
   * Configure les callbacks
   */
  setCallbacks(callbacks: SipEventCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * S'enregistre sur le serveur SIP
   */
  async register(config: SipConfig): Promise<boolean> {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult) return false;
    }

    try {
      this.registrationState = 'registering';
      const result = await LinphoneSip.register({
        server: config.server,
        user: config.user,
        password: config.password,
        domain: config.domain || config.server,
        displayName: config.displayName || config.user,
      });

      if (!result.success) {
        this.registrationState = 'failed';
        console.error('[LinphoneSipService] Échec enregistrement:', result.message);
        return false;
      }

      console.log('[LinphoneSipService] Enregistrement initié');
      return true;
    } catch (error) {
      this.registrationState = 'failed';
      console.error('[LinphoneSipService] Erreur enregistrement:', error);
      return false;
    }
  }

  /**
   * Se désenregistre
   */
  async unregister(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await LinphoneSip.unregister();
      this.registrationState = 'disconnected';
    } catch (error) {
      console.error('[LinphoneSipService] Erreur désenregistrement:', error);
    }
  }

  /**
   * Répond à l'appel entrant
   */
  async answer(): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const result = await LinphoneSip.answer();
      return result.success;
    } catch (error) {
      console.error('[LinphoneSipService] Erreur answer:', error);
      return false;
    }
  }

  /**
   * Raccroche l'appel
   */
  async hangup(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await LinphoneSip.hangup();
    } catch (error) {
      console.error('[LinphoneSipService] Erreur hangup:', error);
    }
  }

  /**
   * Rejette l'appel entrant
   */
  async reject(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await LinphoneSip.reject();
    } catch (error) {
      console.error('[LinphoneSipService] Erreur reject:', error);
    }
  }

  /**
   * Active/désactive le microphone
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    console.log('[LinphoneSipService] setMicrophoneEnabled:', enabled, 'isInitialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.warn('[LinphoneSipService] setMicrophoneEnabled: not initialized, skipping');
      return;
    }

    try {
      const result = await LinphoneSip.setMicrophoneEnabled({ enabled });
      console.log('[LinphoneSipService] setMicrophoneEnabled result:', result);
    } catch (error) {
      console.error('[LinphoneSipService] Erreur setMicrophoneEnabled:', error);
    }
  }

  /**
   * Active/désactive le haut-parleur
   */
  async setSpeakerEnabled(enabled: boolean): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await LinphoneSip.setSpeakerEnabled({ enabled });
    } catch (error) {
      console.error('[LinphoneSipService] Erreur setSpeakerEnabled:', error);
    }
  }

  /**
   * Règle le volume de lecture audio (0.0 à 1.0)
   */
  async setPlaybackGain(gain: number): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await LinphoneSip.setPlaybackGain({ gain });
    } catch (error) {
      console.error('[LinphoneSipService] Erreur setPlaybackGain:', error);
    }
  }

  /**
   * Envoie des DTMF (ex: code pour ouvrir la porte)
   */
  async sendDtmf(dtmf: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await LinphoneSip.sendDtmf({ dtmf });
    } catch (error) {
      console.error('[LinphoneSipService] Erreur sendDtmf:', error);
    }
  }

  /**
   * Retourne l'état actuel
   */
  getRegistrationState(): SipRegistrationState {
    return this.registrationState;
  }

  getCallState(): SipCallState {
    return this.callState;
  }

  isRegistered(): boolean {
    return this.registrationState === 'registered';
  }

  isInCall(): boolean {
    return this.callState === 'incall';
  }

  isRinging(): boolean {
    return this.callState === 'ringing';
  }

  /**
   * Libère les ressources
   */
  async destroy(): Promise<void> {
    // Supprimer les listeners
    for (const handle of this.listenerHandles) {
      handle.remove();
    }
    this.listenerHandles = [];

    if (this.isInitialized) {
      try {
        await LinphoneSip.destroy();
      } catch (error) {
        console.error('[LinphoneSipService] Erreur destroy:', error);
      }
    }

    this.isInitialized = false;
    this.registrationState = 'disconnected';
    this.callState = 'none';
  }
}

// Singleton
export const linphoneSipService = new LinphoneSipService();
export default linphoneSipService;
