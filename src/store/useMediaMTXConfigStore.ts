import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Configuration du serveur MediaMTX (Raspberry Pi)
 *
 * Architecture :
 * - En local (WiFi) : connexion directe au N100 (192.168.1.115:8889)
 * - En distant (4G) : connexion via VPS (webrtc.neolia.app)
 * - Détection automatique du réseau pour choisir la bonne config
 */
export interface MediaMTXConfig {
  /** IP du Raspberry Pi sur le LAN (ex: 192.168.1.115) - utilisée pour connexion locale */
  raspberryPiIp: string;

  /** Port du endpoint WHEP MediaMTX local (par défaut: 8889) */
  whepPort: number;

  /** Hostname distant pour accès via VPS (ex: webrtc.neolia.app) */
  remoteHostname: string;

  /** Nom du stream (par défaut: akuvox) */
  streamName: string;

  /** URL complète du endpoint WHEP (calculée automatiquement selon le mode) */
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

  /** Mode de connexion détecté (local ou remote) */
  detectedMode: 'local' | 'remote' | null;

  // Actions
  setConfig: (config: Partial<MediaMTXConfig>) => void;
  setRaspberryPiIp: (ip: string) => void;
  setRemoteHostname: (hostname: string) => void;
  setTurnConfig: (config: Partial<TurnServerConfig>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDetectedMode: (mode: 'local' | 'remote' | null) => void;
  detectNetworkMode: () => Promise<'local' | 'remote'>;
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

const DEFAULT_WHEP_PORT = 8890;
const DEFAULT_STREAM_NAME = 'akuvox';
const DEFAULT_REMOTE_HOSTNAME = '';

/**
 * Teste si le serveur local (N100) est accessible
 * Timeout rapide pour ne pas bloquer l'application
 */
async function isLocalServerAccessible(localIp: string, port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 secondes max

    const response = await fetch(`http://${localIp}:${port}/v3/config/global/get`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    // Timeout ou erreur réseau = serveur local non accessible
    return false;
  }
}

/**
 * Store Zustand pour la configuration MediaMTX
 * Persiste la config en localStorage pour éviter de la re-saisir
 */
export const useMediaMTXConfigStore = create<MediaMTXConfigState>()(
  persist(
    (set, get) => ({
      config: null,
      turnConfig: DEFAULT_TURN_CONFIG,
      loading: false,
      error: null,
      detectedMode: null,

      setConfig: (partialConfig) =>
        set((state) => {
          const currentConfig = state.config ?? {
            raspberryPiIp: '',
            whepPort: DEFAULT_WHEP_PORT,
            remoteHostname: DEFAULT_REMOTE_HOSTNAME,
            streamName: DEFAULT_STREAM_NAME,
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...currentConfig,
            ...partialConfig,
            lastUpdated: Date.now(),
          };

          // Recalculer l'URL WHEP selon le mode détecté
          const mode = state.detectedMode || 'local';
          const host = mode === 'local' ? newConfig.raspberryPiIp : newConfig.remoteHostname;
          const port = mode === 'local' ? newConfig.whepPort : 443;

          // Générer l'URL WHEP seulement si on a un host valide
          newConfig.whepUrl = host ? generateWhepUrl(host, port, newConfig.streamName) : '';

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
            remoteHostname: DEFAULT_REMOTE_HOSTNAME,
            streamName: DEFAULT_STREAM_NAME,
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...config,
            raspberryPiIp: ip,
            lastUpdated: Date.now(),
          };

          // Recalculer l'URL WHEP selon le mode
          const mode = state.detectedMode || 'local';
          const host = mode === 'local' ? newConfig.raspberryPiIp : newConfig.remoteHostname;
          const port = mode === 'local' ? newConfig.whepPort : 443;

          // Générer l'URL WHEP seulement si on a un host valide
          newConfig.whepUrl = host ? generateWhepUrl(host, port, newConfig.streamName) : '';

          return {
            config: newConfig,
            error: null,
          };
        }),

      setRemoteHostname: (hostname) =>
        set((state) => {
          const config = state.config ?? {
            raspberryPiIp: '',
            whepPort: DEFAULT_WHEP_PORT,
            remoteHostname: hostname,
            streamName: DEFAULT_STREAM_NAME,
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...config,
            remoteHostname: hostname,
            lastUpdated: Date.now(),
          };

          // Recalculer l'URL WHEP selon le mode
          const mode = state.detectedMode || 'local';
          const host = mode === 'local' ? newConfig.raspberryPiIp : newConfig.remoteHostname;
          const port = mode === 'local' ? newConfig.whepPort : 443;

          // Générer l'URL WHEP seulement si on a un host valide
          newConfig.whepUrl = host ? generateWhepUrl(host, port, newConfig.streamName) : '';

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

      setDetectedMode: (mode) => {
        set({ detectedMode: mode });
        // Recalculer l'URL WHEP avec le nouveau mode
        const state = get();
        if (state.config) {
          const host = mode === 'local' ? state.config.raspberryPiIp : state.config.remoteHostname;
          const port = mode === 'local' ? state.config.whepPort : 443;

          // Générer l'URL WHEP seulement si on a un host valide
          const newWhepUrl = host ? generateWhepUrl(host, port, state.config.streamName) : '';

          set({
            config: {
              ...state.config,
              whepUrl: newWhepUrl,
            },
          });
        }
      },

      detectNetworkMode: async () => {
        const state = get();
        const config = state.config;

        if (!config || !config.raspberryPiIp) {
          // Pas de config locale, utiliser le mode remote
          get().setDetectedMode('remote');
          return 'remote';
        }

        console.log('🔍 Detecting network mode...');
        const isLocalAvailable = await isLocalServerAccessible(config.raspberryPiIp, config.whepPort);

        const mode = isLocalAvailable ? 'local' : 'remote';
        console.log(`📡 Network mode detected: ${mode} ${isLocalAvailable ? '(N100 accessible)' : '(using VPS)'}`);

        get().setDetectedMode(mode);
        return mode;
      },

      reset: () =>
        set({
          config: null,
          turnConfig: DEFAULT_TURN_CONFIG,
          loading: false,
          error: null,
          detectedMode: null,
        }),
    }),
    {
      name: 'mediamtx-config',
      // Persister toute la config sauf loading/error/detectedMode
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

  // Les deux champs sont optionnels :
  // - Si pas d'interphone : aucun champ requis
  // - Si uniquement remote : seul le hostname distant est renseigné
  // - Si uniquement local : seule l'IP/hostname local est renseigné
  // - Si les deux : les deux sont renseignés
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostnamePattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

  // Si l'IP/hostname local est fourni, il doit être valide
  const isValidLocal = !config.raspberryPiIp || ipPattern.test(config.raspberryPiIp) || hostnamePattern.test(config.raspberryPiIp);

  // Si le hostname distant est fourni, il doit être valide
  const isValidRemoteHostname = !config.remoteHostname || hostnamePattern.test(config.remoteHostname);

  return isValidLocal && isValidRemoteHostname && config.whepPort > 0;
}
