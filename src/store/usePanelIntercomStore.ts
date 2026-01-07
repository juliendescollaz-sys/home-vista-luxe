import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Configuration de l'interphone pour le Panel
 */
export interface PanelIntercomConfig {
  /** Interphonie activée */
  enabled: boolean;

  /** Configuration SIP */
  sip: {
    /** IP du serveur Asterisk (R-Pi) */
    server: string;
    /** Username SIP du panel */
    user: string;
    /** Mot de passe SIP */
    password: string;
    /** Domaine (généralement = server) */
    domain: string;
  };

  /** Configuration vidéo WHEP */
  video: {
    /** URL du endpoint WHEP (MediaMTX sur R-Pi) */
    whepUrl: string;
  };

  /** Configuration ouverture de porte */
  door: {
    /** Méthode : http, dtmf, ou none */
    method: "http" | "dtmf" | "none";
    /** URL HTTP pour ouvrir (si method = http) */
    httpUrl?: string;
    /** Code DTMF à envoyer (si method = dtmf) */
    dtmfCode?: string;
    /** Délai vidéo après ouverture (secondes) */
    videoDelayAfterOpen: number;
  };

  /** Configuration sonnerie */
  ringtone: {
    /** Nom de la sonnerie (sans extension) */
    name: string;
    /** Volume (0-1) */
    volume: number;
  };
}

/**
 * État d'un appel en cours
 */
export interface PanelIntercomCall {
  /** État de l'appel */
  state: "ringing" | "incall" | "ended";
  /** Identifiant SIP de l'appelant */
  from: string;
  /** Nom affiché de l'appelant */
  displayName: string;
  /** Timestamp début */
  startTime: number;
  /** Porte a été ouverte */
  doorOpened: boolean;
}

interface PanelIntercomState {
  /** Configuration persistée */
  config: PanelIntercomConfig;

  /** Appel en cours (null si pas d'appel) */
  currentCall: PanelIntercomCall | null;

  /** État SIP */
  sipState: "disconnected" | "registering" | "registered" | "error";

  /** Dernière erreur */
  lastError: string | null;

  // Actions config
  setConfig: (config: Partial<PanelIntercomConfig>) => void;
  setSipConfig: (sip: Partial<PanelIntercomConfig["sip"]>) => void;
  setVideoConfig: (video: Partial<PanelIntercomConfig["video"]>) => void;
  setDoorConfig: (door: Partial<PanelIntercomConfig["door"]>) => void;
  setRingtoneConfig: (ringtone: Partial<PanelIntercomConfig["ringtone"]>) => void;
  setEnabled: (enabled: boolean) => void;
  resetConfig: () => void;

  // Actions appel
  setIncomingCall: (from: string, displayName: string) => void;
  setCallState: (state: PanelIntercomCall["state"]) => void;
  setDoorOpened: () => void;
  clearCall: () => void;

  // Actions état
  setSipState: (state: PanelIntercomState["sipState"]) => void;
  setError: (error: string | null) => void;
}

const DEFAULT_CONFIG: PanelIntercomConfig = {
  enabled: false,
  sip: {
    server: "",
    user: "",
    password: "",
    domain: "",
  },
  video: {
    whepUrl: "",
  },
  door: {
    method: "http",
    httpUrl: "",
    dtmfCode: "",
    videoDelayAfterOpen: 5,
  },
  ringtone: {
    name: "default",
    volume: 0.8,
  },
};

export const usePanelIntercomStore = create<PanelIntercomState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      currentCall: null,
      sipState: "disconnected",
      lastError: null,

      // Config actions
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      setSipConfig: (sip) =>
        set((state) => ({
          config: {
            ...state.config,
            sip: { ...state.config.sip, ...sip },
          },
        })),

      setVideoConfig: (video) =>
        set((state) => ({
          config: {
            ...state.config,
            video: { ...state.config.video, ...video },
          },
        })),

      setDoorConfig: (door) =>
        set((state) => ({
          config: {
            ...state.config,
            door: { ...state.config.door, ...door },
          },
        })),

      setRingtoneConfig: (ringtone) =>
        set((state) => ({
          config: {
            ...state.config,
            ringtone: { ...state.config.ringtone, ...ringtone },
          },
        })),

      setEnabled: (enabled) =>
        set((state) => ({
          config: { ...state.config, enabled },
        })),

      resetConfig: () =>
        set({
          config: DEFAULT_CONFIG,
          currentCall: null,
          sipState: "disconnected",
          lastError: null,
        }),

      // Call actions
      setIncomingCall: (from, displayName) =>
        set({
          currentCall: {
            state: "ringing",
            from,
            displayName,
            startTime: Date.now(),
            doorOpened: false,
          },
        }),

      setCallState: (state) =>
        set((prev) => ({
          currentCall: prev.currentCall
            ? { ...prev.currentCall, state }
            : null,
        })),

      setDoorOpened: () =>
        set((prev) => ({
          currentCall: prev.currentCall
            ? { ...prev.currentCall, doorOpened: true }
            : null,
        })),

      clearCall: () =>
        set({
          currentCall: null,
        }),

      // State actions
      setSipState: (sipState) => set({ sipState }),

      setError: (lastError) => set({ lastError }),
    }),
    {
      name: "panel-intercom-storage",
      partialize: (state) => ({
        // Ne persister que la config, pas l'état runtime
        config: state.config,
      }),
    }
  )
);

/**
 * Hook pour vérifier si l'interphone est configuré
 */
export function useIsPanelIntercomConfigured(): boolean {
  const config = usePanelIntercomStore((s) => s.config);

  if (!config.enabled) return false;
  if (!config.sip.server || !config.sip.user || !config.sip.password) return false;

  return true;
}

/**
 * Hook pour obtenir l'URL WHEP
 */
export function usePanelIntercomWhepUrl(): string | null {
  const config = usePanelIntercomStore((s) => s.config);

  if (!config.enabled) return null;
  if (!config.video.whepUrl) {
    // Générer l'URL par défaut si on a le serveur
    if (config.sip.server) {
      return `http://${config.sip.server}:8889/akuvox/whep`;
    }
    return null;
  }

  return config.video.whepUrl;
}

export default usePanelIntercomStore;
