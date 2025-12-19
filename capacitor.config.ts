import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neolia.app",
  appName: "neolia",
  webDir: "dist",
  server: {
    androidScheme: "http",
  },

  /**
   * ✅ Source de vérité runtime (copiée dans android/app/src/main/assets/capacitor.config.json)
   * On utilise ça pour forcer l'UI Panel sans dépendre de import.meta.env (qui te renvoie "unknown" sur le panel).
   */
  appTarget: "panel",

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
