/**
 * Ecran d'accueil du panel
 * Equivalent de PanelHome.tsx
 * Optimise pour ecran 8" (1280x800)
 */
import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useHAStore } from '../store/useHAStore';
import { WeatherCard } from '../components/WeatherCard';
import { DeviceCard } from '../components/DeviceCard';

// Domaines controlables
const CONTROLLABLE_DOMAINS = ['light', 'switch', 'fan', 'cover', 'climate', 'media_player', 'lock', 'vacuum'];

// Entites considerees comme actives
function isEntityActive(entity: any): boolean {
  const domain = entity.entity_id.split('.')[0];

  switch (domain) {
    case 'light':
    case 'switch':
    case 'fan':
    case 'vacuum':
      return entity.state === 'on';
    case 'cover':
      return entity.state !== 'closed';
    case 'climate':
      return entity.state !== 'off';
    case 'media_player':
      return entity.state === 'playing' || entity.state === 'paused';
    case 'lock':
      return entity.state === 'unlocked';
    default:
      return entity.state === 'on';
  }
}

export function HomeScreen() {
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const isConnected = useHAStore((state) => state.isConnected);
  const callService = useHAStore((state) => state.callService);

  // Appareils actifs
  const activeDevices = useMemo(() => {
    if (!entities || entities.length === 0) return [];

    return entities.filter((entity) => {
      const domain = entity.entity_id.split('.')[0];

      // Filtre: domaines controlables uniquement
      if (!CONTROLLABLE_DOMAINS.includes(domain)) return false;

      // Filtre: entites cachees
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      if (reg?.hidden_by || reg?.disabled_by) return false;

      // Filtre: entites actives
      return isEntityActive(entity);
    });
  }, [entities, entityRegistry]);

  // Enrichir avec infos piece/etage
  const enrichedActiveDevices = useMemo(() => {
    return activeDevices.map((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let areaId = reg?.area_id;

      // Si pas d'area sur l'entite, chercher via le device
      if (!areaId && reg?.device_id) {
        const device = devices.find((d) => d.id === reg.device_id);
        areaId = device?.area_id;
      }

      const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
      const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;

      return { entity, area, floor };
    });
  }, [activeDevices, areas, floors, devices, entityRegistry]);

  // Toggle device
  const handleToggle = useCallback(async (entityId: string) => {
    const entity = entities.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = entityId.split('.')[0];
    const isOn = entity.state === 'on';
    const service = isOn ? 'turn_off' : 'turn_on';

    try {
      await callService(domain, service, {}, { entity_id: entityId });
    } catch (error) {
      console.error('[HomeScreen] Toggle error', error);
    }
  }, [entities, callService]);

  // Loading state
  if (!isConnected || entities.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Connexion a Home Assistant...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Meteo */}
      <WeatherCard />

      {/* Appareils actifs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appareils actifs</Text>

        {enrichedActiveDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun appareil actif</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {enrichedActiveDevices.map(({ entity, area, floor }) => (
              <DeviceCard
                key={entity.entity_id}
                entity={entity}
                area={area}
                floor={floor}
                onToggle={handleToggle}
              />
            ))}
          </View>
        )}
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
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});

// Style pour les cartes dans la grille (3 colonnes sur panel 8")
// On calcule la largeur: (largeur ecran - padding - gaps) / 3
// Pour 1280px: (1280 - 48 - 24) / 3 = ~402px par carte
