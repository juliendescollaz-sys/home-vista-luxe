import { useState, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Volume2, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useHAStore } from "@/store/useHAStore";
import type { HAEntity } from "@/types/homeassistant";

interface SonosZoneManagerProps {
  entity: HAEntity;
  client: any;
  onNavigateToMaster?: (entityId: string) => void;
}

export function SonosZoneManager({ entity, client, onNavigateToMaster }: SonosZoneManagerProps) {
  const entities = useHAStore((state) => state.entities);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [volumeTimers, setVolumeTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // Détecter tous les Sonos
  const sonosDevices = useMemo(() => {
    if (!entities.length || !devices.length) return [];
    
    const sonos: HAEntity[] = [];
    entities.forEach((e: HAEntity) => {
      if (!e.entity_id.startsWith("media_player.")) return;
      
      const registryEntry = entityRegistry.find((r: any) => r.entity_id === e.entity_id);
      if (!registryEntry?.device_id) return;
      
      const device = devices.find((d: any) => d.id === registryEntry.device_id);
      if (!device?.manufacturer?.toLowerCase().includes("sonos")) return;
      
      sonos.push(e);
    });
    
    return sonos.sort((a, b) => 
      (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id)
    );
  }, [entities, devices, entityRegistry]);

  // Analyser l'état du groupe
  const groupState = useMemo(() => {
    const groupMembers = entity.attributes.group_members || [];
    const isInGroup = Array.isArray(groupMembers) && groupMembers.length > 1;
    
    // Le coordinateur/maître est le premier membre de la liste
    const coordinator = isInGroup ? groupMembers[0] : null;
    const isMaster = isInGroup && coordinator === entity.entity_id;
    const isMember = isInGroup && coordinator !== entity.entity_id;
    
    return {
      isInGroup,
      isMaster,
      isMember,
      isSolo: !isInGroup,
      coordinator,
      members: isInGroup ? groupMembers : [],
    };
  }, [entity]);

  // Enceintes disponibles pour créer un groupe (non groupées)
  const availableDevices = useMemo(() => {
    return sonosDevices.filter((device) => {
      if (device.entity_id === entity.entity_id) return false;
      const members = device.attributes.group_members || [];
      return !Array.isArray(members) || members.length <= 1;
    });
  }, [sonosDevices, entity.entity_id]);

  const refreshStates = useCallback(async () => {
    if (!client) return;
    try {
      const newStates = await client.getStates();
      useHAStore.getState().setEntities(newStates);
    } catch (error) {
      console.error("Error refreshing states:", error);
    }
  }, [client]);

  const handleVolumeChange = useCallback((entityId: string, value: number[]) => {
    if (volumeTimers[entityId]) {
      clearTimeout(volumeTimers[entityId]);
    }

    const timer = setTimeout(async () => {
      try {
        await client.callService("media_player", "volume_set", {
          volume_level: value[0] / 100,
        }, {
          entity_id: entityId,
        });
      } catch (error) {
        toast.error("Erreur lors du changement de volume");
      }
    }, 150);

    setVolumeTimers({ ...volumeTimers, [entityId]: timer });
  }, [client, volumeTimers]);

  const handleCreateGroup = useCallback(async () => {
    if (selectedMembers.size === 0 || !client) return;
    
    setPending(true);
    try {
      await client.callService("sonos", "join", {
        master: entity.entity_id,
        entity_id: Array.from(selectedMembers),
      });
      
      setSelectedMembers(new Set());
      
      setTimeout(async () => {
        await refreshStates();
        setPending(false);
        toast.success("Groupe créé");
      }, 1000);
    } catch (error) {
      setPending(false);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création du groupe");
    }
  }, [client, entity.entity_id, selectedMembers, refreshStates]);

  const handleUnjoinMember = useCallback(async (memberId: string) => {
    if (!client) return;
    
    setPending(true);
    try {
      await client.callService("sonos", "unjoin", {
        entity_id: memberId,
      });
      
      setTimeout(async () => {
        await refreshStates();
        setPending(false);
        toast.success("Enceinte retirée du groupe");
      }, 800);
    } catch (error) {
      setPending(false);
      toast.error(error instanceof Error ? error.message : "Erreur lors du retrait");
    }
  }, [client, refreshStates]);

  const handleUnjoinAll = useCallback(async () => {
    if (!client || !groupState.isInGroup) return;
    
    setPending(true);
    try {
      await Promise.all(
        groupState.members.map((memberId) =>
          client.callService("sonos", "unjoin", {
            entity_id: memberId,
          })
        )
      );
      
      setTimeout(async () => {
        await refreshStates();
        setPending(false);
        toast.success("Groupe dissocié");
      }, 800);
    } catch (error) {
      setPending(false);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la dissociation");
    }
  }, [client, groupState, refreshStates]);

  const handleLeaveGroup = useCallback(async () => {
    await handleUnjoinMember(entity.entity_id);
  }, [entity.entity_id, handleUnjoinMember]);

  const handleMemberToggle = useCallback((entityId: string, checked: boolean) => {
    const newMembers = new Set(selectedMembers);
    if (checked) {
      newMembers.add(entityId);
    } else {
      newMembers.delete(entityId);
    }
    setSelectedMembers(newMembers);
  }, [selectedMembers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Volume & Zones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* (A) Enceinte actuelle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              {entity.attributes.friendly_name}
            </Label>
            <span className="text-xs text-muted-foreground">
              {groupState.isMaster && "Maître du groupe"}
              {groupState.isMember && "Membre du groupe"}
              {groupState.isSolo && "Non groupée"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Slider
              value={[Math.round((entity.attributes.volume_level || 0) * 100)]}
              onValueChange={(value) => handleVolumeChange(entity.entity_id, value)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {Math.round((entity.attributes.volume_level || 0) * 100)}%
            </span>
          </div>
        </div>

        {/* (B) Groupe actuel - Si MAÎTRE */}
        {groupState.isMaster && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label className="text-base font-semibold">Groupe actuel</Label>
            </div>
            
            {groupState.members.map((memberId) => {
              const memberEntity = entities.find((e) => e.entity_id === memberId);
              if (!memberEntity) return null;
              
              const isMasterItem = memberId === entity.entity_id;
              const friendlyName = memberEntity.attributes.friendly_name || memberId;
              const volumeLevel = memberEntity.attributes.volume_level || 0;
              
              return (
                <div key={memberId} className="space-y-2 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {friendlyName} {isMasterItem && <span className="text-xs text-muted-foreground">(Maître)</span>}
                    </Label>
                    {!isMasterItem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnjoinMember(memberId)}
                        disabled={pending}
                        className="h-7 text-xs"
                      >
                        Retirer
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[Math.round(volumeLevel * 100)]}
                      onValueChange={(value) => handleVolumeChange(memberId, value)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {Math.round(volumeLevel * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
            
            <Button
              onClick={handleUnjoinAll}
              disabled={pending}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Dissocier tout le groupe
            </Button>
          </div>
        )}

        {/* (B) Groupe actuel - Si MEMBRE */}
        {groupState.isMember && groupState.coordinator && (
          <div className="space-y-3 pt-4 border-t">
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-sm mb-3">
                Cette enceinte fait partie du groupe de{" "}
                <span className="font-semibold">
                  {entities.find((e) => e.entity_id === groupState.coordinator)?.attributes.friendly_name || groupState.coordinator}
                </span>
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleLeaveGroup}
                  disabled={pending}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Quitter le groupe
                </Button>
                
                {onNavigateToMaster && (
                  <Button
                    onClick={() => onNavigateToMaster(groupState.coordinator!)}
                    variant="ghost"
                    size="sm"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* (C) Créer un groupe - Si SOLO */}
        {groupState.isSolo && availableDevices.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">Créer un groupe avec…</Label>
            
            <div className="space-y-2">
              {availableDevices.map((device) => (
                <div
                  key={device.entity_id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleMemberToggle(device.entity_id, !selectedMembers.has(device.entity_id))}
                >
                  <Checkbox
                    id={`create-${device.entity_id}`}
                    checked={selectedMembers.has(device.entity_id)}
                    onCheckedChange={(checked) =>
                      handleMemberToggle(device.entity_id, checked as boolean)
                    }
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`create-${device.entity_id}`} className="text-base font-normal flex-1 cursor-pointer">
                    {device.attributes.friendly_name || device.entity_id}
                  </Label>
                </div>
              ))}
            </div>
            
            {selectedMembers.size > 0 && (
              <Button
                onClick={handleCreateGroup}
                disabled={pending}
                size="sm"
                className="w-full"
              >
                Grouper ({selectedMembers.size} enceinte{selectedMembers.size > 1 ? "s" : ""})
              </Button>
            )}
          </div>
        )}

        {/* Message si aucune autre enceinte disponible */}
        {groupState.isSolo && availableDevices.length === 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Aucune autre enceinte Sonos disponible pour créer un groupe
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
