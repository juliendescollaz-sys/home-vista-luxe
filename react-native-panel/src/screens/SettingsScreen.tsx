/**
 * Ecran des parametres
 * Configuration HA, SIP, theme
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHAStore } from '../store/useHAStore';

// Cles de stockage
const STORAGE_KEYS = {
  HA_URL: '@neolia/ha_url',
  HA_TOKEN: '@neolia/ha_token',
  SIP_SERVER: '@neolia/sip_server',
  SIP_USER: '@neolia/sip_user',
  SIP_PASSWORD: '@neolia/sip_password',
  AKUVOX_IP: '@neolia/akuvox_ip',
};

export function SettingsScreen() {
  const isConnected = useHAStore((state) => state.isConnected);
  const connect = useHAStore((state) => state.connect);
  const disconnect = useHAStore((state) => state.disconnect);

  // HA config
  const [haUrl, setHaUrl] = useState('');
  const [haToken, setHaToken] = useState('');

  // SIP config
  const [sipServer, setSipServer] = useState('');
  const [sipUser, setSipUser] = useState('');
  const [sipPassword, setSipPassword] = useState('');

  // Akuvox config
  const [akuvoxIp, setAkuvoxIp] = useState('');

  // Charger la config au demarrage
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [url, token, server, user, password, ip] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HA_URL),
        AsyncStorage.getItem(STORAGE_KEYS.HA_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.SIP_SERVER),
        AsyncStorage.getItem(STORAGE_KEYS.SIP_USER),
        AsyncStorage.getItem(STORAGE_KEYS.SIP_PASSWORD),
        AsyncStorage.getItem(STORAGE_KEYS.AKUVOX_IP),
      ]);

      if (url) setHaUrl(url);
      if (token) setHaToken(token);
      if (server) setSipServer(server);
      if (user) setSipUser(user);
      if (password) setSipPassword(password);
      if (ip) setAkuvoxIp(ip);
    } catch (error) {
      console.error('[Settings] Load config error', error);
    }
  };

  const saveHAConfig = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HA_URL, haUrl);
      await AsyncStorage.setItem(STORAGE_KEYS.HA_TOKEN, haToken);

      // Tester la connexion
      await connect(haUrl, haToken);
      Alert.alert('Succes', 'Connexion a Home Assistant reussie');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se connecter a Home Assistant');
    }
  };

  const saveSipConfig = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SIP_SERVER, sipServer);
      await AsyncStorage.setItem(STORAGE_KEYS.SIP_USER, sipUser);
      await AsyncStorage.setItem(STORAGE_KEYS.SIP_PASSWORD, sipPassword);

      // TODO: Appeler le module natif SIP pour s'enregistrer
      Alert.alert('Succes', 'Configuration SIP sauvegardee');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la config SIP');
    }
  };

  const saveAkuvoxConfig = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AKUVOX_IP, akuvoxIp);
      Alert.alert('Succes', 'Configuration Akuvox sauvegardee');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la config Akuvox');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Home Assistant */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Home Assistant</Text>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Statut</Text>
            <View style={[styles.statusBadge, isConnected && styles.statusBadgeConnected]}>
              <Text style={styles.statusText}>
                {isConnected ? 'Connecte' : 'Deconnecte'}
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="URL (ex: http://192.168.1.x:8123)"
            placeholderTextColor="#666"
            value={haUrl}
            onChangeText={setHaUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Token d'acces"
            placeholderTextColor="#666"
            value={haToken}
            onChangeText={setHaToken}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable style={styles.button} onPress={saveHAConfig}>
            <Text style={styles.buttonText}>Connecter</Text>
          </Pressable>
        </View>
      </View>

      {/* Interphone SIP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interphone (SIP)</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Serveur SIP (ex: 192.168.1.115)"
            placeholderTextColor="#666"
            value={sipServer}
            onChangeText={setSipServer}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Identifiant"
            placeholderTextColor="#666"
            value={sipUser}
            onChangeText={setSipUser}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#666"
            value={sipPassword}
            onChangeText={setSipPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable style={styles.button} onPress={saveSipConfig}>
            <Text style={styles.buttonText}>Sauvegarder</Text>
          </Pressable>
        </View>
      </View>

      {/* Akuvox RTSP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Video Akuvox (RTSP)</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="IP Akuvox (ex: 192.168.1.100)"
            placeholderTextColor="#666"
            value={akuvoxIp}
            onChangeText={setAkuvoxIp}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.hint}>
            URL RTSP: rtsp://{akuvoxIp || 'xxx.xxx.xxx.xxx'}/live/ch00_0
          </Text>

          <Pressable style={styles.button} onPress={saveAkuvoxConfig}>
            <Text style={styles.buttonText}>Sauvegarder</Text>
          </Pressable>
        </View>
      </View>

      {/* A propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>A propos</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>Neolia Panel v1.0.0</Text>
          <Text style={styles.aboutSubtext}>React Native + Linphone SDK</Text>
          <Text style={styles.aboutSubtext}>2025 Neolia</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  statusBadge: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeConnected: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  aboutText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
  aboutSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
