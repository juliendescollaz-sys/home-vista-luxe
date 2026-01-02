import { create } from 'zustand';
import { safePersist as persist } from "@/lib/persistMiddleware";

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

  /** Mode de connexion préféré: 'auto' (détection), 'local' (forcé), ou 'remote' (forcé) */
  preferredMode: 'auto' | 'local' | 'remote';

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
 * - HTTP avec port pour les IPs locales et hostnames .local (mDNS)
 * - HTTPS sans port pour les hostnames distants (géré par tunnel ngrok/Cloudflare)
 */
function generateWhepUrl(host: string, port: number, streamName: string): string {
  // Détecter si c'est une IP (commence par un chiffre) ou un hostname mDNS (.local)
  const isIpAddress = /^\d/.test(host);
  const isLocalHostname = host.endsWith('.local');

  // HTTP pour IP et .local, HTTPS pour remote hostnames
  const protocol = isIpAddress || isLocalHostname ? 'http' : 'https';

  // Pour HTTPS (hostname distant), ne pas inclure le port (ngrok/Cloudflare gèrent ça)
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
const DEFAULT_REMOTE_HOSTNAME = 'webrtc.neolia.app';
const DEFAULT_PREFERRED_MODE = 'auto';

/**
 * Détecte si l'appareil est connecté via une connexion cellulaire (4G/5G)
 * Utilise l'API Network Information si disponible (Chrome/Android uniquement, pas Safari)
 */
function isCellularConnection(): boolean | null {
  try {
    // API Network Information (disponible sur Chrome/Android, PAS sur Safari iOS)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
      const type = connection.effectiveType || connection.type;
      console.log('📱 Connection type detected:', type);

      // Si c'est du cellular, on est en 4G/5G (pas sur le réseau local)
      if (connection.type === 'cellular') {
        return true;
      }

      // Détecter aussi via effectiveType (slow-2g, 2g, 3g, 4g)
      if (['slow-2g', '2g', '3g', '4g'].includes(type)) {
        return true;
      }

      // Si on a l'API et que ce n'est pas cellular, c'est du WiFi
      return false;
    }

    // API non disponible (Safari iOS)
    console.warn('⚠️ Network Information API not available (Safari iOS)');
    return null;
  } catch (err) {
    console.warn('⚠️ Network Information API error:', err);
    return null;
  }
}

/**
 * Teste si le serveur local est accessible via WebSocket ping
 * Utilisé sur Safari iOS où l'API Network Information n'est pas disponible
 */
async function testLocalServerWithWebSocket(localIp: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    // Déclarer ws en premier pour éviter les problèmes de scope
    const ws = new WebSocket(`ws://${localIp}:${port}/`);
    let resolved = false;

    // Timeout de 1.5 secondes (rapide si WiFi local, échoue vite si 4G)
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      console.log('⏱️ WebSocket ping timeout (likely not on local network)');
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(false);
    }, 1500);

    ws.onopen = () => {
      if (resolved) return;
      resolved = true;
      console.log('✅ WebSocket ping successful (local network)');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };

    ws.onerror = () => {
      if (resolved) return;
      resolved = true;
      console.log('❌ WebSocket ping failed (not on local network)');
      clearTimeout(timeout);
      resolve(false);
    };
  });
}

/**
 * Teste si le serveur local (N100) est accessible
 * - Chrome/Android : utilise l'API Network Information
 * - Safari iOS : utilise un WebSocket ping avec timeout court
 */
async function isLocalServerAccessible(localIp: string, port: number): Promise<boolean> {
  // 1. Essayer l'API Network Information (Chrome/Android)
  const cellularStatus = isCellularConnection();

  if (cellularStatus === true) {
    console.log('📱 Cellular connection detected, server not accessible');
    return false;
  }

  if (cellularStatus === false) {
    console.log('📶 WiFi connection detected via Network API');
    return true;
  }

  // 2. API non disponible (Safari iOS) → tester avec WebSocket ping
  console.log('🔍 Testing local server with WebSocket ping...');
  return await testLocalServerWithWebSocket(localIp, port);
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
            preferredMode: DEFAULT_PREFERRED_MODE as 'auto' | 'local' | 'remote',
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...currentConfig,
            ...partialConfig,
            lastUpdated: Date.now(),
          };

          // Calculer le mode effectif selon preferredMode
          let effectiveMode: 'local' | 'remote';
          if (newConfig.preferredMode === 'local') {
            effectiveMode = 'local';
          } else if (newConfig.preferredMode === 'remote') {
            effectiveMode = 'remote';
          } else {
            // Mode auto: si raspberryPiIp configuré, local, sinon remote
            effectiveMode = newConfig.raspberryPiIp ? 'local' : 'remote';
          }

          const host = effectiveMode === 'local' ? newConfig.raspberryPiIp : newConfig.remoteHostname;
          const port = effectiveMode === 'local' ? newConfig.whepPort : 443;

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
            preferredMode: DEFAULT_PREFERRED_MODE as 'auto' | 'local' | 'remote',
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...config,
            raspberryPiIp: ip,
            lastUpdated: Date.now(),
          };

          // Calculer le mode effectif selon preferredMode
          let effectiveMode: 'local' | 'remote';
          if (newConfig.preferredMode === 'local') {
            effectiveMode = 'local';
          } else if (newConfig.preferredMode === 'remote') {
            effectiveMode = 'remote';
          } else {
            // Mode auto: si raspberryPiIp configuré, local, sinon remote
            effectiveMode = newConfig.raspberryPiIp ? 'local' : 'remote';
          }

          const host = effectiveMode === 'local' ? newConfig.raspberryPiIp : newConfig.remoteHostname;
          const port = effectiveMode === 'local' ? newConfig.whepPort : 443;

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
            preferredMode: DEFAULT_PREFERRED_MODE as 'auto' | 'local' | 'remote',
            whepUrl: '',
            lastUpdated: Date.now(),
          };

          const newConfig: MediaMTXConfig = {
            ...config,
            remoteHostname: hostname,
            lastUpdated: Date.now(),
          };

          // Calculer le mode effectif selon preferredMode
          let effectiveMode: 'local' | 'remote';
          if (newConfig.preferredMode === 'local') {
            effectiveMode = 'local';
          } else if (newConfig.preferredMode === 'remote') {
            effectiveMode = 'remote';
          } else {
            // Mode auto: si raspberryPiIp configuré, local, sinon remote
            effectiveMode = newConfig.raspberryPiIp ? 'local' : 'remote';
          }

          const host = effectiveMode === 'local' ? newConfig.raspberryPiIp : newConfig.remoteHostname;
          const port = effectiveMode === 'local' ? newConfig.whepPort : 443;

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

        // Si l'utilisateur a forcé un mode, l'utiliser
        if (config?.preferredMode === 'local') {
          console.log('📡 Network mode: local (forced by user)');
          get().setDetectedMode('local');
          return 'local';
        }

        if (config?.preferredMode === 'remote') {
          console.log('📡 Network mode: remote (forced by user)');
          get().setDetectedMode('remote');
          return 'remote';
        }

        // Mode auto: détection automatique
        if (!config || !config.raspberryPiIp) {
          // Pas de config locale, utiliser le mode remote
          console.log('📡 Network mode: remote (no local config)');
          get().setDetectedMode('remote');
          return 'remote';
        }

        // Tester si le serveur local est accessible (timeout 2s)
        console.log('📡 Testing local server accessibility...');
        const isLocalAccessible = await isLocalServerAccessible(config.raspberryPiIp, config.whepPort);

        if (isLocalAccessible) {
          console.log('✅ Network mode: local (server accessible)');
          get().setDetectedMode('local');
          return 'local';
        } else {
          console.log('🌐 Network mode: remote (server not accessible, fallback to remote)');
          get().setDetectedMode('remote');
          return 'remote';
        }
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
