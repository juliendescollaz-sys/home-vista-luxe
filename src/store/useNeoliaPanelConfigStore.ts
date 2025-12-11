// src/store/useNeoliaPanelConfigStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NeoliaPanelConfig } from "@/api/neoliaHaClient";

export interface NeoliaPanelConfigState {
  /** Configuration Neolia récupérée depuis HA (null si pas encore chargée) */
  config: NeoliaPanelConfig | null;
  /** Erreur lors du chargement (null si pas d'erreur) */
  error: string | null;
  /** Indique si le chargement est en cours */
  loading: boolean;
  /** Indique si le chargement a été tenté au moins une fois */
  loaded: boolean;

  /** Code Neolia (4 derniers chiffres SN) saisi par l'utilisateur */
  enteredNeoliaCode: string;
  /** Indique si l'étape de saisie du code SN a été validée */
  hasCompletedSnStep: boolean;

  // Actions
  setConfig: (config: NeoliaPanelConfig) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  setEnteredNeoliaCode: (code: string) => void;
  setHasCompletedSnStep: (completed: boolean) => void;
  reset: () => void;
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

      setConfig: (config) =>
        set({
          config,
          error: null,
          loading: false,
          loaded: true,
        }),

      setError: (error) =>
        set({
          error,
          loading: false,
          loaded: true,
        }),

      setLoading: (loading) => set({ loading }),

      setEnteredNeoliaCode: (code) => set({ enteredNeoliaCode: code }),

      setHasCompletedSnStep: (completed) => set({ hasCompletedSnStep: completed }),

      reset: () =>
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
      partialize: (state) => ({
        enteredNeoliaCode: state.enteredNeoliaCode,
        hasCompletedSnStep: state.hasCompletedSnStep,
      }),
    }
  )
);
