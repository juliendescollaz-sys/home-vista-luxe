import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neolia.app",
  appName: "neolia",
  webDir: "dist",
  server: {
    /**
     * L'app PANEL doit être servie depuis le bundle local (dist),
     * sans URL distante Lovable, pour éviter tout mixed content.
     * On utilise le schéma http pour que les requêtes vers le LAN
     * (http://192.168.x.x:8765) soient autorisées.
     */
    androidScheme: "http",
  },
};

export default config;
