/**
 * Carte meteo animee
 * Equivalent de AnimatedWeatherTile
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHAStore } from '../store/useHAStore';

// Mapping condition meteo -> emoji
const WEATHER_ICONS: Record<string, string> = {
  'clear-night': '🌙',
  'cloudy': '☁️',
  'fog': '🌫️',
  'hail': '🌨️',
  'lightning': '⚡',
  'lightning-rainy': '⛈️',
  'partlycloudy': '⛅',
  'pouring': '🌧️',
  'rainy': '🌦️',
  'snowy': '❄️',
  'snowy-rainy': '🌨️',
  'sunny': '☀️',
  'windy': '💨',
  'windy-variant': '🌬️',
  'exceptional': '⚠️',
};

export function WeatherCard() {
  const entities = useHAStore((state) => state.entities);

  // Trouver l'entite meteo
  const weatherEntity = entities.find((e) => e.entity_id.startsWith('weather.'));

  if (!weatherEntity) {
    return (
      <View style={styles.card}>
        <Text style={styles.noData}>Meteo non disponible</Text>
      </View>
    );
  }

  const condition = weatherEntity.state;
  const icon = WEATHER_ICONS[condition] || '🌡️';
  const temperature = weatherEntity.attributes.temperature;
  const humidity = weatherEntity.attributes.humidity;
  const friendlyName = weatherEntity.attributes.friendly_name || 'Meteo';

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{temperature}°C</Text>
          <Text style={styles.condition}>{condition}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detail}>💧 {humidity}%</Text>
        <Text style={styles.location}>{friendlyName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  noData: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
    marginRight: 24,
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
  },
  condition: {
    color: '#9CA3AF',
    fontSize: 18,
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detail: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  location: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
