import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Volume2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useSonosGroups } from "@/hooks/useSonosGroups";
import { useHAStore } from "@/store/useHAStore";

const SonosZones = () => {
  const navigate = useNavigate();
  
  const {
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
  } = useSonosGroups();

  const [volumeTimers, setVolumeTimers] = useState<Record<string, NodeJS.Timeout>>({});

  if (sonosDevices.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Zones Sonos</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Aucune enceinte Sonos détectée. Vérifiez l'intégration Sonos dans Home Assistant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleMemberToggle = (entityId: string, checked: boolean) => {
    const newMembers = new Set(selectedMembers);
    if (checked) {
      newMembers.add(entityId);
    } else {
      newMembers.delete(entityId);
    }
    setSelectedMembers(newMembers);
  };

  const handleCreateGroup = async () => {
    try {
      await createGroup();
      toast.success("Groupe mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création du groupe");
    }
  };

  const handleUnjoin = async (entityId: string) => {
    try {
      await unjoinDevice(entityId);
      toast.success("Enceinte retirée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du retrait");
    }
  };

  const handleUnjoinAll = async () => {
    try {
      await unjoinAll();
      toast.success("Toutes les enceintes dissociées");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la dissociation");
    }
  };

  const handleVolumeChange = (entityId: string, value: number[]) => {
    // Debounce 150ms
    if (volumeTimers[entityId]) {
      clearTimeout(volumeTimers[entityId]);
    }

    const timer = setTimeout(async () => {
      try {
        await setVolume(entityId, value[0] / 100);
      } catch (error) {
        toast.error("Erreur lors du changement de volume");
      }
    }, 150);

    setVolumeTimers({ ...volumeTimers, [entityId]: timer });
  };

  const handleApplyPreset = async (scriptEntityId: string) => {
    try {
      await applyPreset(scriptEntityId);
      toast.success("Preset appliqué");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'application du preset");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Zones Sonos</h1>
      </div>

      {/* Création de groupe */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Créer/Modifier un groupe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Coordinateur (maître)</Label>
            <div className="space-y-2">
              {sonosDevices.map((device) => (
                <div key={`master-${device.entity_id}`} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`master-${device.entity_id}`}
                    name="master"
                    checked={selectedMaster === device.entity_id}
                    onChange={() => setSelectedMaster(device.entity_id)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`master-${device.entity_id}`} className="text-sm">
                    {device.friendly_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Membres du groupe</Label>
            <div className="space-y-2">
              {sonosDevices
                .filter((d) => d.entity_id !== selectedMaster)
                .map((device) => (
                  <div key={`member-${device.entity_id}`} className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${device.entity_id}`}
                      checked={selectedMembers.has(device.entity_id)}
                      onCheckedChange={(checked) =>
                        handleMemberToggle(device.entity_id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`member-${device.entity_id}`} className="text-sm">
                      {device.friendly_name}
                    </Label>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateGroup}
              disabled={!selectedMaster || selectedMembers.size === 0 || pending}
              className="flex-1"
            >
              Créer/Mettre à jour le groupe
            </Button>
            <Button onClick={handleUnjoinAll} disabled={pending} variant="outline">
              Tout dissocier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets de zones */}
      {zonePresets.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Presets de zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zonePresets.map((preset) => (
                <Button
                  key={preset.entity_id}
                  onClick={() => handleApplyPreset(preset.entity_id)}
                  disabled={pending}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {preset.friendly_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volumes individuels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Volumes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sonosDevices.map((device) => (
              <div key={`volume-${device.entity_id}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{device.friendly_name}</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnjoin(device.entity_id)}
                    disabled={pending}
                  >
                    Retirer
                  </Button>
                </div>
                <Slider
                  value={[Math.round((device.volume_level || 0) * 100)]}
                  onValueChange={(value) => handleVolumeChange(device.entity_id, value)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SonosZones;
