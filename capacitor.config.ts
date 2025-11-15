import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neolia.app',
  appName: 'neolia',
  webDir: 'dist',
  server: {
    url: 'https://32ef1c2d-50bc-470e-89b0-6aace8a102ee.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
