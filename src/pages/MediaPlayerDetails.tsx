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
import { useState, useEffect, useMemo, useCallback } from "react";
import EntityControl from "@/components/EntityControl";

const MediaPlayerDetails = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { client } = useHAClient();
  
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const connection = useHAStore((state) => state.connection);
  
  const decodedEntityId = useMemo(() => decodeURIComponent(entityId || ""), [entityId]);
  
  const entity = useMemo(
    () => entities.find((e) => e.entity_id === decodedEntityId),
    [entities, decodedEntityId]
  );

  // Récupérer toutes les entités associées (même device_id)
  const entityReg = useMemo(
    () => entity ? entityRegistry.find((r) => r.entity_id === entity.entity_id) : null,
    [entity, entityRegistry]
  );
  
  const deviceId = entityReg?.device_id;
  
  const relatedEntities = useMemo(() => {
    if (!deviceId || !entity) return [];
    return entities.filter((e) => {
      if (e.entity_id === entity.entity_id) return false;
      const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
      return reg?.device_id === deviceId;
    });
  }, [deviceId, entity, entities, entityRegistry]);

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

  const callService = useCallback(async (service: string, data?: any) => {
    if (!client || !entity) {
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
  }, [client, entity]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying && canPause) {
      callService("media_pause");
    } else if (canPlay) {
      callService("media_play");
    }
  }, [isPlaying, canPause, canPlay, callService]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
  }, []);

  const handleVolumeChangeEnd = useCallback((value: number[]) => {
    const volumeLevel = value[0] / 100;
    callService("volume_set", { volume_level: volumeLevel });
  }, [callService]);

  const handleMute = useCallback(() => {
    callService("volume_mute", { is_volume_muted: !isMuted });
  }, [callService, isMuted]);

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
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-center gap-2">
            {canShuffle && (
              <Button
                variant={attributes.shuffle ? "default" : "outline"}
                className="h-12 w-12 min-w-12 p-0 flex items-center justify-center aspect-square shrink-0"
                onClick={() => callService("shuffle_set", { shuffle: !attributes.shuffle })}
              >
                <Shuffle className="h-5 w-5" />
              </Button>
            )}
            
            {canPrevious && (
              <Button
                variant="ghost"
                className="h-12 w-12 min-w-12 p-0 flex items-center justify-center aspect-square shrink-0"
                onClick={() => callService("media_previous_track")}
              >
                <SkipBack className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="default"
              className="h-14 w-14 min-w-14 p-0 flex items-center justify-center aspect-square shrink-0"
              onClick={handlePlayPause}
              disabled={!canPlay && !canPause}
            >
              {isPlaying ? (
                <Pause className="h-9 w-9" />
              ) : (
                <Play className="h-9 w-9 ml-0.5" />
              )}
            </Button>

            {canNext && (
              <Button
                variant="ghost"
                className="h-12 w-12 min-w-12 p-0 flex items-center justify-center aspect-square shrink-0"
                onClick={() => callService("media_next_track")}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            )}

            {canRepeat && (
              <Button
                variant={attributes.repeat && attributes.repeat !== "off" ? "default" : "outline"}
                className="h-12 w-12 min-w-12 p-0 flex items-center justify-center aspect-square relative shrink-0"
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
                  <Repeat className="h-5 w-5" />
                )}
                {attributes.repeat && attributes.repeat !== "off" && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-background rounded-full border border-primary" />
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
