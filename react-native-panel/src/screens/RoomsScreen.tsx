/**
 * Ecran des pieces
 * Liste toutes les pieces avec apercu des appareils
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHAStore } from '../store/useHAStore';

export function RoomsScreen() {
  const navigation = useNavigation();
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);

  // Grouper les pieces par etage
  const roomsByFloor = useMemo(() => {
    const result: Record<string, typeof areas> = {};

    // Pieces sans etage
    const noFloor = areas.filter((a) => !a.floor_id);
    if (noFloor.length > 0) {
      result['_none'] = noFloor;
    }

    // Pieces par etage
    floors.forEach((floor) => {
      const roomsInFloor = areas.filter((a) => a.floor_id === floor.floor_id);
      if (roomsInFloor.length > 0) {
        result[floor.floor_id] = roomsInFloor;
      }
    });

    return result;
  }, [areas, floors]);

  // Compter les appareils actifs par piece
  const getActiveCount = (areaId: string): number => {
    return entities.filter((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let entityAreaId = reg?.area_id;

      if (!entityAreaId && reg?.device_id) {
        const device = devices.find((d) => d.id === reg.device_id);
        entityAreaId = device?.area_id;
      }

      if (entityAreaId !== areaId) return false;

      const domain = entity.entity_id.split('.')[0];
      if (!['light', 'switch', 'fan', 'cover', 'climate', 'media_player'].includes(domain)) {
        return false;
      }

      return entity.state === 'on' || entity.state === 'playing';
    }).length;
  };

  const navigateToRoom = (areaId: string) => {
    // @ts-ignore - Navigation typing
    navigation.navigate('RoomDetails', { areaId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {Object.entries(roomsByFloor).map(([floorId, rooms]) => {
        const floor = floors.find((f) => f.floor_id === floorId);
        const floorName = floor?.name || 'Autres';

        return (
          <View key={floorId} style={styles.floorSection}>
            <Text style={styles.floorTitle}>{floorName}</Text>

            <View style={styles.grid}>
              {rooms.map((area) => {
                const activeCount = getActiveCount(area.area_id);

                return (
                  <Pressable
                    key={area.area_id}
                    style={({ pressed }) => [
                      styles.roomCard,
                      pressed && styles.roomCardPressed,
                    ]}
                    onPress={() => navigateToRoom(area.area_id)}
                  >
                    <Text style={styles.roomIcon}>🏠</Text>
                    <Text style={styles.roomName}>{area.name}</Text>
                    {activeCount > 0 && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{activeCount}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {areas.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucune piece configuree</Text>
          <Text style={styles.emptySubtext}>
            Configurez vos pieces dans Home Assistant
          </Text>
        </View>
      )}
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
  floorSection: {
    marginBottom: 24,
  },
  floorTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roomCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    width: '31%',
    minWidth: 180,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  roomCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  roomIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roomName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
