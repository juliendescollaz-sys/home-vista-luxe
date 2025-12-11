// src/store/useNeoliaPanelConfigStore.ts

import { create } from "zustand";
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

  // Actions
  setConfig: (config: NeoliaPanelConfig) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useNeoliaPanelConfigStore = create<NeoliaPanelConfigState>((set) => ({
  config: null,
  error: null,
  loading: false,
  loaded: false,

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

  reset: () =>
    set({
      config: null,
      error: null,
      loading: false,
      loaded: false,
    }),
}));
