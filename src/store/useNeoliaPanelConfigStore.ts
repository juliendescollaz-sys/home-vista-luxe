import { create } from "zustand";
import { safePersist as persist } from "@/lib/persistMiddleware";
import type { NeoliaPanelConfig } from "@/api/neoliaHaClient";

export interface NeoliaPanelConfigState {
  /** Configuration Neolia récupérée depuis discovery/HA (null si pas encore chargée) */
  config: NeoliaPanelConfig | null;
  error: string | null;
  loading: boolean;
  loaded: boolean;

  /** 4 derniers chiffres du SN saisis par l'installateur */
  enteredNeoliaCode: string;
  /** L'étape SN a été validée (même si on repasse par l'onboarding plus tard) */
  hasCompletedSnStep: boolean;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConfig: (config: NeoliaPanelConfig | null) => void;
  setEnteredNeoliaCode: (code: string) => void;
  markSnStepCompleted: () => void;
  resetAll: () => void;
}

export const useNeoliaPanelConfigStore = create<NeoliaPanelConfigState>()(
  persist(
    (set) => ({
      config: null,
      error: null,
      loading: false,
      loaded: false,
      enteredNeoliaCode: "",
      hasCompletedSnStep: false,

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setConfig: (config) =>
        set({
          config,
          loaded: true,
          error: null,
        }),
      setEnteredNeoliaCode: (code) => set({ enteredNeoliaCode: code }),
      markSnStepCompleted: () => set({ hasCompletedSnStep: true }),
      resetAll: () =>
        set({
          config: null,
          error: null,
          loading: false,
          loaded: false,
          enteredNeoliaCode: "",
          hasCompletedSnStep: false,
        }),
    }),
    {
      name: "neolia-panel-config",
      // On ne persiste PAS la config réseau (par sécurité),
      // seulement le code et le fait que l'étape SN est faites.
      partialize: (state) => ({
        enteredNeoliaCode: state.enteredNeoliaCode,
        hasCompletedSnStep: state.hasCompletedSnStep,
      }),
    }
  )
);
