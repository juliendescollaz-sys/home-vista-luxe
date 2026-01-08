import type { LinphoneSipPlugin } from './linphone-sip';

/**
 * Implémentation web (stub) pour le développement
 * Le SIP natif ne fonctionne que sur Android
 * En mode web, on retourne des valeurs par défaut
 */
export class LinphoneSipWeb implements LinphoneSipPlugin {
  private listeners: Map<string, Set<Function>> = new Map();

  async initialize(): Promise<{ success: boolean; message: string }> {
    console.warn('[LinphoneSip Web] SIP natif non disponible sur le web');
    return { success: false, message: 'SIP natif disponible uniquement sur Android' };
  }

  async register(_options: {
    server: string;
    user: string;
    password: string;
    domain?: string;
    displayName?: string;
  }): Promise<{ success: boolean; message: string }> {
    console.warn('[LinphoneSip Web] register() non disponible sur le web');
    return { success: false, message: 'Non disponible sur le web' };
  }

  async unregister(): Promise<{ success: boolean }> {
    console.warn('[LinphoneSip Web] unregister() non disponible sur le web');
    return { success: false };
  }

  async answer(): Promise<{ success: boolean }> {
    console.warn('[LinphoneSip Web] answer() non disponible sur le web');
    return { success: false };
  }

  async hangup(): Promise<{ success: boolean }> {
    console.warn('[LinphoneSip Web] hangup() non disponible sur le web');
    return { success: false };
  }

  async reject(): Promise<{ success: boolean }> {
    console.warn('[LinphoneSip Web] reject() non disponible sur le web');
    return { success: false };
  }

  async getState(): Promise<{
    initialized: boolean;
    registered: boolean;
    callState: 'none' | 'ringing' | 'outgoing' | 'incall' | 'paused' | 'ended' | 'error' | 'unknown';
    incomingCallFrom?: string;
  }> {
    return {
      initialized: false,
      registered: false,
      callState: 'none',
    };
  }

  async setMicrophoneEnabled(options: { enabled: boolean }): Promise<{ success: boolean; microphoneEnabled: boolean }> {
    return { success: false, microphoneEnabled: options.enabled };
  }

  async setSpeakerEnabled(options: { enabled: boolean }): Promise<{ success: boolean; speakerEnabled: boolean }> {
    return { success: false, speakerEnabled: options.enabled };
  }

  async setPlaybackGain(options: { gain: number }): Promise<{ success: boolean; gain: number }> {
    return { success: false, gain: options.gain };
  }

  async sendDtmf(_options: { dtmf: string }): Promise<{ success: boolean }> {
    console.warn('[LinphoneSip Web] sendDtmf() non disponible sur le web');
    return { success: false };
  }

  async destroy(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async addListener(
    eventName: string,
    listenerFunc: Function
  ): Promise<{ remove: () => void }> {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listenerFunc);

    return {
      remove: () => {
        this.listeners.get(eventName)?.delete(listenerFunc);
      },
    };
  }

  async removeAllListeners(): Promise<void> {
    this.listeners.clear();
  }

  // Méthode utilitaire pour simuler des événements en dev
  simulateIncomingCall(from: string, displayName: string) {
    const listeners = this.listeners.get('incomingCall');
    if (listeners) {
      listeners.forEach((fn) => fn({ from, displayName }));
    }
  }
}
