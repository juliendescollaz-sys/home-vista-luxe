import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Configuration du serveur MediaMTX (Raspberry Pi)
 *
 * Architecture :
 * - Raspberry Pi héberge MediaMTX qui convertit RTSP (Akuvox) → WebRTC
 * - L'IP du Raspberry peut changer (DHCP)
 * - Config récupérée via l'API de configuration (port 8080) ou saisie manuellement
 */
export interface MediaMTXConfig {
  /** IP du Raspberry Pi sur le LAN (ex: 192.168.1.115) */
  raspberryPiIp: string;

  /** Port du endpoint WHEP MediaMTX (par défaut: 8889) */
  whepPort: number;

  /** Nom du stream (par défaut: akuvox) */
  streamName: string;

  /** URL complète du endpoint WHEP (calculée automatiquement) */
  whepUrl: string;

  /** Dernière mise à jour de la config */
  lastUpdated: number;
}

export interface TurnServerConfig {
  /** URL du serveur TURN (ex: turn:141.227.158.64:3478) */
  url: string;

  /** Username TURN */
  username: string;

  /** Credential TURN */
  credential: string;

  /** Realm (optionnel) */
  realm?: string;
}

interface MediaMTXConfigState {
  /** Configuration MediaMTX actuelle */
  config: MediaMTXConfig | null;

  /** Configuration du serveur TURN pour les connexions remote */
  turnConfig: TurnServerConfig;

  /** Indicateur de chargement */
  loading: boolean;

  /** Erreur éventuelle */
  error: string | null;

  // Actions
  setConfig: (config: Partial<MediaMTXConfig>) => void;
  setRaspberryPiIp: (ip: string) => void;
  setTurnConfig: (config: Partial<TurnServerConfig>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Génère l'URL complète du endpoint WHEP
 * Utilise HTTPS pour les hostnames (non-IP), HTTP pour les IPs locales
 * Pour les hostnames HTTPS, le port n'est pas ajouté (géré par le tunnel)
 */
function generateWhepUrl(host: string, port: number, streamName: string): string {
  // Détecter si c'est une IP (commence par un chiffre) ou un hostname
  const isIpAddress = /^\d/.test(host);
  const protocol = isIpAddress ? 'http' : 'https';

  // Pour HTTPS (hostname), ne pas inclure le port (ngrok/Cloudflare gèrent ça)
  const portSuffix = protocol === 'https' ? '' : `:${port}`;

  return `${protocol}://${host}${portSuffix}/${streamName}/whep`;
}

/**
 * Configuration par défaut (valeurs du contexte projet)
 */
const DEFAULT_TURN_CONFIG: TurnServerConfig = {
  url: 'turn:141.227.158.64:3478',
  username: 'neolia',
  credential: 'Neolia022Turn',
  realm: 'turn.sip.neolia.ch',
};

const DEFAULT_WHEP_PORT = 8889;
const DEFAULT_STREAM_NAME = 'akuvox';

/**
 * Store Zustand pour la configuration MediaMTX
 * Persiste la config en localStorage pour éviter de la re-saisir
 */
export const useMediaMTXConfigStore = create<MediaMTXConfigState>()(
  persist(
    (set) => ({
      config: null,
      turnConfig: DEFAULT_TURN_CONFIG,
      loading: false,
      error: null,

      setConfig: (partialConfig) =>
        set((state) => {
          const currentConfig = state.config ?? {
            raspberryPiIp: '',
            whepPort: DEFAULT_WHEP_PORT,
            streamName: DEFAULT_STREAM_NAME,
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...currentConfig,
            ...partialConfig,
            lastUpdated: Date.now(),
          };

          // Recalculer l'URL WHEP
          newConfig.whepUrl = generateWhepUrl(
            newConfig.raspberryPiIp,
            newConfig.whepPort,
            newConfig.streamName
          );

          return {
            config: newConfig,
            error: null,
          };
        }),

      setRaspberryPiIp: (ip) =>
        set((state) => {
          const config = state.config ?? {
            raspberryPiIp: ip,
            whepPort: DEFAULT_WHEP_PORT,
            streamName: DEFAULT_STREAM_NAME,
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...config,
            raspberryPiIp: ip,
            lastUpdated: Date.now(),
          };

          newConfig.whepUrl = generateWhepUrl(
            newConfig.raspberryPiIp,
            newConfig.whepPort,
            newConfig.streamName
          );

          return {
            config: newConfig,
            error: null,
          };
        }),

      setTurnConfig: (partialTurnConfig) =>
        set((state) => ({
          turnConfig: {
            ...state.turnConfig,
            ...partialTurnConfig,
          },
        })),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      reset: () =>
        set({
          config: null,
          turnConfig: DEFAULT_TURN_CONFIG,
          loading: false,
          error: null,
        }),
    }),
    {
      name: 'mediamtx-config',
      // Persister toute la config sauf loading/error
      partialize: (state) => ({
        config: state.config,
        turnConfig: state.turnConfig,
      }),
    }
  )
);

/**
 * Hook helper pour vérifier si la config est valide
 */
export function useIsMediaMTXConfigValid(): boolean {
  const config = useMediaMTXConfigStore((state) => state.config);

  if (!config) return false;

  // Vérifier que l'IP ou le hostname est renseigné et semble valide
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostnamePattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

  const isValidHost = ipPattern.test(config.raspberryPiIp) || hostnamePattern.test(config.raspberryPiIp);
  return isValidHost && config.whepPort > 0;
}
