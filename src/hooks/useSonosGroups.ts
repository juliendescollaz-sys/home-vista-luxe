import { useEffect, useState, useCallback } from "react";
import { useHAStore } from "@/store/useHAStore";
import type { HAEntity, HADevice } from "@/types/homeassistant";

interface SonosDevice {
  entity_id: string;
  friendly_name: string;
  volume_level?: number;
  group_members?: string[];
  is_coordinator?: boolean;
}

interface ScriptEntity {
  entity_id: string;
  friendly_name: string;
}

export function useSonosGroups() {
  const entities = useHAStore((state) => state.entities);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  
  const [sonosDevices, setSonosDevices] = useState<SonosDevice[]>([]);
  const [zonePresets, setZonePresets] = useState<ScriptEntity[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<string>("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  // Détecter les enceintes Sonos
  useEffect(() => {
    if (!entities.length || !devices.length) return;

    const sonosEntities: SonosDevice[] = [];
    
    entities.forEach((entity: HAEntity) => {
      if (!entity.entity_id.startsWith("media_player.")) return;
      
      const registryEntry = entityRegistry.find((r: any) => r.entity_id === entity.entity_id);
      if (!registryEntry?.device_id) return;
      
      const device = devices.find((d: HADevice) => d.id === registryEntry.device_id);
      if (!device?.manufacturer?.toLowerCase().includes("sonos")) return;

      sonosEntities.push({
        entity_id: entity.entity_id,
        friendly_name: entity.attributes.friendly_name || entity.entity_id,
        volume_level: entity.attributes.volume_level,
        group_members: entity.attributes.group_members || [],
        is_coordinator: entity.attributes.is_volume_muted !== undefined,
      });
    });

    setSonosDevices(sonosEntities.sort((a, b) => 
      a.friendly_name.localeCompare(b.friendly_name)
    ));
  }, [entities, devices, entityRegistry]);

  // Détecter les presets de zones (scripts.zone_*)
  useEffect(() => {
    const scripts = entities.filter((e: HAEntity) => 
      e.entity_id.startsWith("script.zone_")
    );
    
    setZonePresets(scripts.map((s: HAEntity) => ({
      entity_id: s.entity_id,
      friendly_name: s.attributes.friendly_name || s.entity_id.replace("script.zone_", "Zone "),
    })));
  }, [entities]);

  // Créer/mettre à jour un groupe
  const createGroup = useCallback(async () => {
    if (!client || !selectedMaster || selectedMembers.size === 0) return;

    setPending(true);
    try {
      await client.callService(
        "sonos", 
        "join", 
        { 
          main: selectedMaster,
          entity_id: Array.from(selectedMembers)
        }
      );

      // Rafraîchir les états
      setTimeout(async () => {
        const newStates = await client.getStates();
        useHAStore.getState().setEntities(newStates);
        setPending(false);
      }, 500);

      return true;
    } catch (error) {
      setPending(false);
      throw error;
    }
  }, [client, selectedMaster, selectedMembers]);

  // Retirer une enceinte du groupe
  const unjoinDevice = useCallback(async (entityId: string) => {
    if (!client) return;

    setPending(true);
    try {
      await client.callService(
        "media_player", 
        "unjoin", 
        undefined,
        { entity_id: entityId }
      );

      setTimeout(async () => {
        const newStates = await client.getStates();
        useHAStore.getState().setEntities(newStates);
        setPending(false);
      }, 500);

      return true;
    } catch (error) {
      setPending(false);
      throw error;
    }
  }, [client]);

  // Tout dissocier
  const unjoinAll = useCallback(async () => {
    if (!client || sonosDevices.length === 0) return;

    setPending(true);
    try {
      await Promise.all(
        sonosDevices.map((device) =>
          client.callService(
            "media_player", 
            "unjoin", 
            undefined,
            { entity_id: device.entity_id }
          )
        )
      );

      setTimeout(async () => {
        const newStates = await client.getStates();
        useHAStore.getState().setEntities(newStates);
        setPending(false);
      }, 500);

      return true;
    } catch (error) {
      setPending(false);
      throw error;
    }
  }, [client, sonosDevices]);

  // Ajuster le volume
  const setVolume = useCallback(async (entityId: string, volumeLevel: number) => {
    if (!client) return;

    await client.callService(
      "media_player", 
      "volume_set", 
      { volume_level: volumeLevel },
      { entity_id: entityId }
    );
  }, [client]);

  // Lancer un preset
  const applyPreset = useCallback(async (scriptEntityId: string) => {
    if (!client) return;

    setPending(true);
    try {
      await client.callService(
        "script", 
        "turn_on", 
        undefined,
        { entity_id: scriptEntityId }
      );

      setTimeout(async () => {
        const newStates = await client.getStates();
        useHAStore.getState().setEntities(newStates);
        setPending(false);
      }, 500);

      return true;
    } catch (error) {
      setPending(false);
      throw error;
    }
  }, [client]);

  // Snapshot
  const snapshot = useCallback(async (entityIds: string[]) => {
    if (!client) return;

    await client.callService(
      "sonos", 
      "snapshot", 
      { with_group: true },
      { entity_id: entityIds }
    );
  }, [client]);

  // Restore
  const restore = useCallback(async (entityIds: string[]) => {
    if (!client) return;

    await client.callService(
      "sonos", 
      "restore", 
      { with_group: true },
      { entity_id: entityIds }
    );
  }, [client]);

  return {
    sonosDevices,
    zonePresets,
    selectedMaster,
    setSelectedMaster,
    selectedMembers,
    setSelectedMembers,
    pending,
    createGroup,
    unjoinDevice,
    unjoinAll,
    setVolume,
    applyPreset,
    snapshot,
    restore,
  };
}
