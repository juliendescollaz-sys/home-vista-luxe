// src/store/useNeoliaSettings.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isPanelMode } from "@/lib/platform";

export interface NeoliaSettingsState {
  // MQTT settings
  mqttHost: string;
  mqttPort: number;
  mqttUseSecure: boolean;
  mqttUsername: string;
  mqttPassword: string;

  // Actions
  setMqttHost: (host: string) => void;
  setMqttPort: (port: number) => void;
  setMqttUseSecure: (useSecure: boolean) => void;
  setMqttUsername: (username: string) => void;
  setMqttPassword: (password: string) => void;
  setMqttSettings: (settings: Partial<Pick<NeoliaSettingsState, 'mqttHost' | 'mqttPort' | 'mqttUseSecure' | 'mqttUsername' | 'mqttPassword'>>) => void;
}

/**
 * Retourne les valeurs par défaut MQTT selon le mode d'exécution.
 * En mode Panel : credentials pré-configurés pour Zero-Config.
 * En mode Mobile/Tablet : valeurs vides (configuration manuelle requise).
 */
function getDefaultMqttSettings() {
  if (isPanelMode()) {
    // Mode Panel : Zero-Config avec credentials hardcodés
    return {
      mqttHost: "homeassistant.local",
      mqttPort: 1884,
      mqttUseSecure: false,
      mqttUsername: "panel",
      mqttPassword: "PanelMQTT!2025",
    };
  }

  // Mode Mobile/Tablet : configuration manuelle
  return {
    mqttHost: "192.168.1.219",
    mqttPort: 1884,
    mqttUseSecure: false,
    mqttUsername: "",
    mqttPassword: "",
  };
}

const defaults = getDefaultMqttSettings();

export const useNeoliaSettings = create<NeoliaSettingsState>()(
  persist(
    (set) => ({
      // Initial values
      mqttHost: defaults.mqttHost,
      mqttPort: defaults.mqttPort,
      mqttUseSecure: defaults.mqttUseSecure,
      mqttUsername: defaults.mqttUsername,
      mqttPassword: defaults.mqttPassword,

      // Actions
      setMqttHost: (host) => set({ mqttHost: host }),
      setMqttPort: (port) => set({ mqttPort: port }),
      setMqttUseSecure: (useSecure) => set({ mqttUseSecure: useSecure }),
      setMqttUsername: (username) => set({ mqttUsername: username }),
      setMqttPassword: (password) => set({ mqttPassword: password }),
      setMqttSettings: (settings) => set(settings),
    }),
    {
      name: "neolia-settings",
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<NeoliaSettingsState>),
      }),
    }
  )
);
