import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neolia.app',
  appName: 'neolia',
  webDir: 'dist',
  server: {
    /**
     * Pas d'URL distante ici : l'app est chargée depuis le bundle local (dist)
     * pour éviter le mixed content HTTPS -> HTTP quand on contacte le PC.
     */
    androidScheme: 'http'
  }
};

export default config;
