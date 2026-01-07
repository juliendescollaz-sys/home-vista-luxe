import { registerPlugin } from '@capacitor/core';

/**
 * Interface pour le plugin Linphone SIP natif Android
 */
export interface LinphoneSipPlugin {
  /**
   * Initialise le SDK Linphone
   */
  initialize(): Promise<{ success: boolean; message: string }>;

  /**
   * S'enregistre sur un serveur SIP
   */
  register(options: {
    server: string;      // IP ou hostname du serveur Asterisk
    user: string;        // Username SIP (ex: panel-401)
    password: string;    // Mot de passe SIP
    domain?: string;     // Domaine SIP (par défaut = server)
    displayName?: string; // Nom affiché
  }): Promise<{ success: boolean; message: string }>;

  /**
   * Se désenregistre du serveur SIP
   */
  unregister(): Promise<{ success: boolean }>;

  /**
   * Répond à un appel entrant
   */
  answer(): Promise<{ success: boolean }>;

  /**
   * Raccroche l'appel en cours
   */
  hangup(): Promise<{ success: boolean }>;

  /**
   * Rejette un appel entrant
   */
  reject(): Promise<{ success: boolean }>;

  /**
   * Retourne l'état actuel
   */
  getState(): Promise<{
    initialized: boolean;
    registered: boolean;
    callState: 'none' | 'ringing' | 'outgoing' | 'incall' | 'paused' | 'ended' | 'error' | 'unknown';
    incomingCallFrom?: string;
  }>;

  /**
   * Active/désactive le microphone
   */
  setMicrophoneEnabled(options: { enabled: boolean }): Promise<{ success: boolean; microphoneEnabled: boolean }>;

  /**
   * Active/désactive le haut-parleur
   */
  setSpeakerEnabled(options: { enabled: boolean }): Promise<{ success: boolean; speakerEnabled: boolean }>;

  /**
   * Envoie des DTMF (ex: pour ouvrir une porte via code)
   */
  sendDtmf(options: { dtmf: string }): Promise<{ success: boolean }>;

  /**
   * Libère les ressources
   */
  destroy(): Promise<{ success: boolean }>;

  /**
   * Ajoute un listener pour les événements
   */
  addListener(
    eventName: 'incomingCall',
    listenerFunc: (data: { from: string; displayName: string }) => void
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: 'callConnected',
    listenerFunc: (data: { state: string }) => void
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: 'callEnded',
    listenerFunc: (data: { reason: string }) => void
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: 'registrationStateChanged',
    listenerFunc: (data: { state: string; message: string }) => void
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: 'error',
    listenerFunc: (data: { error: string }) => void
  ): Promise<{ remove: () => void }>;

  /**
   * Supprime tous les listeners
   */
  removeAllListeners(): Promise<void>;
}

// Enregistrer le plugin (sera disponible uniquement sur Android)
const LinphoneSip = registerPlugin<LinphoneSipPlugin>('LinphoneSip', {
  web: () => import('./linphone-sip-web').then((m) => new m.LinphoneSipWeb()),
});

export default LinphoneSip;
