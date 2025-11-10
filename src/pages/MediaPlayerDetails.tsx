import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Repeat1, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHAClient } from "@/hooks/useHAClient";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { HAEntity } from "@/types/homeassistant";

// Composant pour contrôler une entité associée
const EntityControl = ({ entity, client, mediaPlayerName }: { entity: HAEntity; client: any; mediaPlayerName: string }) => {
  const [localValue, setLocalValue] = useState<number>(0);
  const domain = entity.entity_id.split(".")[0];

  // Nettoyer le nom en retirant le nom de la pièce
  const cleanName = entity.attributes.friendly_name?.replace(mediaPlayerName, "").trim() || entity.attributes.friendly_name;

  useEffect(() => {
    // Initialiser la valeur pour les sliders de type number
    if (domain === "number" && entity.state) {
      const numValue = parseFloat(entity.state);
      if (!isNaN(numValue)) {
        setLocalValue(numValue);
      }
    }
  }, [entity.state, domain]);

  const callEntityService = async (service: string, data?: any) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    try {
      await client.callService(domain, service, data, { entity_id: entity.entity_id });
      toast.success("Commande envoyée");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle");
    }
  };

  const handleSwitchToggle = (checked: boolean) => {
    callEntityService(checked ? "turn_on" : "turn_off");
  };

  const handleSelectChange = (value: string) => {
    callEntityService("select_option", { option: value });
  };

  const handleNumberChange = (value: number[]) => {
    setLocalValue(value[0]);
  };

  const handleNumberChangeEnd = (value: number[]) => {
    callEntityService("set_value", { value: value[0] });
  };

  const handleButtonPress = () => {
    callEntityService("press");
  };

  // Switch (toggle on/off)
  if (domain === "switch") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">{cleanName}</Label>
          <Switch
            checked={entity.state === "on"}
            onCheckedChange={handleSwitchToggle}
          />
        </div>
      </Card>
    );
  }

  // Select (dropdown)
  if (domain === "select") {
    const options = entity.attributes.options || [];
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <Label className="text-base">{cleanName}</Label>
          <Select value={entity.state} onValueChange={handleSelectChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    );
  }

  // Number (slider)
  if (domain === "number") {
    const min = entity.attributes.min ?? 0;
    const max = entity.attributes.max ?? 100;
    const step = entity.attributes.step ?? 1;
    
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">{cleanName}</Label>
            <span className="text-sm font-medium">{localValue}</span>
          </div>
          <Slider
            value={[localValue]}
            onValueChange={handleNumberChange}
            onValueCommit={handleNumberChangeEnd}
            min={min}
            max={max}
            step={step}
          />
        </div>
      </Card>
    );
  }

  // Button (press action)
  if (domain === "button") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">{cleanName}</Label>
          <Button onClick={handleButtonPress} size="sm">
            Activer
          </Button>
        </div>
      </Card>
    );
  }

  // Sensor ou autre (read-only)
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">{cleanName}</Label>
        <div className="text-right">
          <p className="text-sm font-medium">
            {entity.state} {entity.attributes.unit_of_measurement || ""}
          </p>
        </div>
      </div>
    </Card>
  );
};

const MediaPlayerDetails = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { client } = useHAClient();
  
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const entity = entities.find((e) => e.entity_id === decodeURIComponent(entityId || ""));

  // Récupérer toutes les entités associées (même device_id)
  const entityReg = entity ? entityRegistry.find((r) => r.entity_id === entity.entity_id) : null;
  const deviceId = entityReg?.device_id;
  
  const relatedEntities = deviceId ? entities.filter((e) => {
    if (e.entity_id === entity?.entity_id) return false; // Exclure le media_player lui-même
    const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
    return reg?.device_id === deviceId;
  }) : [];

  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (entity?.attributes.volume_level !== undefined) {
      setVolume(entity.attributes.volume_level * 100);
    }
  }, [entity?.attributes.volume_level]);

  if (!entity) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-20">
        <TopBar />
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Appareil introuvable</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const connection = useHAStore((state) => state.connection);
  const { state, attributes } = entity;
  const isPlaying = state === "playing";
  const isMuted = attributes.is_volume_muted;
  const mediaTitle = attributes.media_title || "Aucun média";
  const mediaArtist = attributes.media_artist || "";
  const mediaAlbum = attributes.media_album_name || "";
  const entityPicture = attributes.entity_picture;
  const albumArt = entityPicture && connection?.url 
    ? `${connection.url}${entityPicture}` 
    : entityPicture;
  const supportedFeatures = attributes.supported_features || 0;

  // Vérifier les fonctionnalités supportées (bitwise flags)
  const SUPPORT_PAUSE = 1;
  const SUPPORT_SEEK = 2;
  const SUPPORT_VOLUME_SET = 4;
  const SUPPORT_VOLUME_MUTE = 8;
  const SUPPORT_PREVIOUS_TRACK = 16;
  const SUPPORT_NEXT_TRACK = 32;
  const SUPPORT_PLAY = 16384;
  const SUPPORT_SHUFFLE_SET = 32768;
  const SUPPORT_REPEAT_SET = 262144;

  const canPause = (supportedFeatures & SUPPORT_PAUSE) !== 0;
  const canPlay = (supportedFeatures & SUPPORT_PLAY) !== 0;
  const canSeek = (supportedFeatures & SUPPORT_SEEK) !== 0;
  const canSetVolume = (supportedFeatures & SUPPORT_VOLUME_SET) !== 0;
  const canMute = (supportedFeatures & SUPPORT_VOLUME_MUTE) !== 0;
  const canPrevious = (supportedFeatures & SUPPORT_PREVIOUS_TRACK) !== 0;
  const canNext = (supportedFeatures & SUPPORT_NEXT_TRACK) !== 0;
  const canShuffle = (supportedFeatures & SUPPORT_SHUFFLE_SET) !== 0;
  const canRepeat = (supportedFeatures & SUPPORT_REPEAT_SET) !== 0;

  const callService = async (service: string, data?: any) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    try {
      await client.callService("media_player", service, data, { entity_id: entity.entity_id });
      toast.success("Commande envoyée");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle");
    }
  };

  const handlePlayPause = () => {
    if (isPlaying && canPause) {
      callService("media_pause");
    } else if (canPlay) {
      callService("media_play");
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
  };

  const handleVolumeChangeEnd = (value: number[]) => {
    const volumeLevel = value[0] / 100;
    callService("volume_set", { volume_level: volumeLevel });
  };

  const handleMute = () => {
    callService("volume_mute", { is_volume_muted: !isMuted });
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* Jaquette et infos */}
        <Card className="overflow-hidden mb-6">
          <div className="relative">
            {albumArt && (
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <img
                  src={albumArt}
                  alt={mediaTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
            )}
            
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-1">{mediaTitle}</h1>
              {mediaArtist && (
                <p className="text-lg text-muted-foreground mb-1">{mediaArtist}</p>
              )}
              {mediaAlbum && (
                <p className="text-sm text-muted-foreground">{mediaAlbum}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Contrôles de lecture */}
        <Card className="p-6 mb-4">
          <div className="flex items-center justify-center gap-4">
            {canShuffle && (
              <Button
                variant={attributes.shuffle ? "default" : "ghost"}
                className="h-14 w-14 min-w-14 p-0 flex items-center justify-center aspect-square"
                onClick={() => callService("shuffle_set", { shuffle: !attributes.shuffle })}
              >
                <Shuffle className="h-6 w-6" />
              </Button>
            )}
            
            {canPrevious && (
              <Button
                variant="ghost"
                className="h-14 w-14 min-w-14 p-0 flex items-center justify-center aspect-square"
                onClick={() => callService("media_previous_track")}
              >
                <SkipBack className="h-6 w-6" />
              </Button>
            )}

            <Button
              variant="default"
              className="h-20 w-20 min-w-20 p-0 flex items-center justify-center aspect-square"
              onClick={handlePlayPause}
              disabled={!canPlay && !canPause}
            >
              {isPlaying ? (
                <Pause className="h-10 w-10" />
              ) : (
                <Play className="h-10 w-10 ml-1" />
              )}
            </Button>

            {canNext && (
              <Button
                variant="ghost"
                className="h-14 w-14 min-w-14 p-0 flex items-center justify-center aspect-square"
                onClick={() => callService("media_next_track")}
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            )}

            {canRepeat && (
              <Button
                variant={attributes.repeat && attributes.repeat !== "off" ? "default" : "ghost"}
                className="h-14 w-14 min-w-14 p-0 flex items-center justify-center aspect-square relative"
                onClick={() => {
                  const repeatModes = ["off", "all", "one"];
                  const currentMode = attributes.repeat || "off";
                  const currentIndex = repeatModes.indexOf(currentMode);
                  const nextMode = repeatModes[(currentIndex + 1) % repeatModes.length];
                  callService("repeat_set", { repeat: nextMode });
                }}
              >
                {attributes.repeat === "one" ? (
                  <Repeat1 className="h-6 w-6" />
                ) : (
                  <Repeat className="h-6 w-6" />
                )}
                {attributes.repeat && attributes.repeat !== "off" && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-background rounded-full border-2 border-primary" />
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Contrôle du volume */}
        {canSetVolume && (
          <Card className="p-6">
            <div className="flex items-center gap-4">
              {canMute && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              )}
              
              <div className="flex-1">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  onValueCommit={handleVolumeChangeEnd}
                  max={100}
                  step={1}
                  disabled={isMuted}
                />
              </div>
              
              <span className="text-sm text-muted-foreground w-12 text-right">
                {Math.round(volume)}%
              </span>
            </div>
          </Card>
        )}

        {/* Entités associées */}
        {relatedEntities.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Contrôles associés</h2>
            <div className="space-y-3">
              {relatedEntities.map((relatedEntity) => (
                <EntityControl 
                  key={relatedEntity.entity_id} 
                  entity={relatedEntity} 
                  client={client}
                  mediaPlayerName={entity.attributes.friendly_name}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default MediaPlayerDetails;
