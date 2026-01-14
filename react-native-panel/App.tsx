/**
 * Neolia Panel - Application React Native
 * Panel mural 8" pour domotique Home Assistant
 */
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppNavigator } from './src/navigation/AppNavigator';
import { useHAStore } from './src/store/useHAStore';

// Ignorer certains warnings non critiques
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Cles de stockage
const STORAGE_KEYS = {
  HA_URL: '@neolia/ha_url',
  HA_TOKEN: '@neolia/ha_token',
};

function App() {
  const connect = useHAStore((state) => state.connect);

  // Auto-connexion au demarrage si config existe
  useEffect(() => {
    autoConnect();
  }, []);

  const autoConnect = async () => {
    try {
      const [url, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HA_URL),
        AsyncStorage.getItem(STORAGE_KEYS.HA_TOKEN),
      ]);

      if (url && token) {
        console.log('[App] Auto-connecting to Home Assistant...');
        await connect(url, token);
      }
    } catch (error) {
      console.error('[App] Auto-connect failed', error);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
