import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SIPConfig } from '@/services/sipService';

/**
 * Store Zustand pour la configuration SIP de l'utilisateur
 *
 * Persiste les identifiants SIP en localStorage pour :
 * - Éviter de redemander les credentials à chaque refresh
 * - Permettre la reconnexion automatique
 * - Gérer l'authentification utilisateur via code QR
 *
 * Workflow :
 * 1. Utilisateur scanne le QR code (ou entre manuellement le code d'auth)
 * 2. L'app récupère les credentials SIP depuis la plateforme Neolia
 * 3. Les credentials sont sauvegardés dans ce store
 * 4. sipService.init() est appelé avec ces credentials
 * 5. L'utilisateur est enregistré sur Kamailio et prêt à recevoir des appels
 */

export interface SIPConfigState {
  /** Configuration SIP de l'utilisateur */
  config: SIPConfig | null;

  /** Code d'authentification utilisateur (généré par Neolia ou Panel) */
  authCode: string | null;

  /** Met à jour la configuration SIP */
  setConfig: (config: SIPConfig | null) => void;

  /** Met à jour le code d'authentification */
  setAuthCode: (code: string) => void;

  /** Réinitialise toute la configuration (logout) */
  reset: () => void;
}

/**
 * Hook pour accéder au store de configuration SIP
 */
export const useSIPConfigStore = create<SIPConfigState>()(
  persist(
    (set) => ({
      config: null,
      authCode: null,

      setConfig: (config) => set({ config }),

      setAuthCode: (code) => set({ authCode: code }),

      reset: () =>
        set({
          config: null,
          authCode: null,
        }),
    }),
    {
      name: 'sip-config-storage',
      version: 1,
    }
  )
);

/**
 * Hook pour vérifier si la configuration SIP est valide
 */
export function useIsSIPConfigured(): boolean {
  const config = useSIPConfigStore((state) => state.config);

  if (!config) return false;

  // Vérifier que tous les champs obligatoires sont renseignés
  return !!(
    config.uri &&
    config.password &&
    config.wsServers &&
    config.uri.includes('@') && // Format valide : user@domain
    config.wsServers.startsWith('wss://') // WebSocket sécurisé obligatoire
  );
}
