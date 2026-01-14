/**
 * Carte d'appareil pour le panel
 * Affiche l'etat d'une entite HA avec toggle
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { HAEntity, HAArea, HAFloor } from '../store/useHAStore';

interface DeviceCardProps {
  entity: HAEntity;
  area?: HAArea | null;
  floor?: HAFloor | null;
  onToggle?: (entityId: string) => void;
}

// Icones simples en texte (a remplacer par react-native-vector-icons)
const DOMAIN_ICONS: Record<string, string> = {
  light: '💡',
  switch: '🔌',
  fan: '🌀',
  cover: '🪟',
  climate: '🌡️',
  media_player: '🔊',
  lock: '🔒',
  vacuum: '🤖',
  sensor: '📊',
  binary_sensor: '⚡',
};

export function DeviceCard({ entity, area, floor, onToggle }: DeviceCardProps) {
  const isOn = entity.state === 'on';
  const domain = entity.entity_id.split('.')[0];
  const icon = DOMAIN_ICONS[domain] || '📦';

  // Nom convivial
  const friendlyName = entity.attributes.friendly_name || entity.entity_id.split('.')[1];

  // Sous-titre (piece/etage)
  const subtitle = [area?.name, floor?.name].filter(Boolean).join(' - ');

  return (
    <Pressable
      onPress={() => onToggle?.(entity.entity_id)}
      style={({ pressed }) => [
        styles.card,
        isOn && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={[styles.statusDot, isOn && styles.statusDotOn]} />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {friendlyName}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}

      <Text style={[styles.state, isOn && styles.stateOn]}>
        {isOn ? 'Allumé' : 'Éteint'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    minHeight: 120,
  },
  cardActive: {
    backgroundColor: '#1565C0',
    borderColor: '#2196F3',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  statusDotOn: {
    backgroundColor: '#4CAF50',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  state: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  stateOn: {
    color: '#FFFFFF',
  },
});
