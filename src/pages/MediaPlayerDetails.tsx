import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Repeat1, Shuffle, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState, useEffect, useMemo, useCallback } from "react";
import EntityControl from "@/components/EntityControl";
import { MediaPlayerControls } from "@/components/MediaPlayerControls";
import { cn } from "@/lib/utils";
import { SonosBrowser } from "@/components/SonosBrowser";
import { SonosZoneManager } from "@/components/SonosZoneManager";
import { useMediaPlayerTimeline } from "@/hooks/useMediaPlayerTimeline";
import { useMediaPlayerControls } from "@/hooks/useMediaPlayerControls";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const MediaPlayerDetails = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const connection = useHAStore((state) => state.connection);
  const areas = useHAStore((state) => state.areas);
  const devices = useHAStore((state) => state.devices);
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[26px]";
  
  const decodedEntityId = useMemo(() => decodeURIComponent(entityId || ""), [entityId]);

  // Scroll to top lors de la navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [decodedEntityId]);
  
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
  const [pending, setPending] = useState({
    playPause: false,
    previous: false,
    next: false,
    shuffle: false,
    repeat: false,
  });
  

  // Tous les calculs dérivés doivent être mémoïsés AVANT le early return
  const entityData = useMemo(() => {
    if (!entity) return null;
    
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

    return {
      state,
      attributes,
      isPlaying,
      isMuted,
      mediaTitle,
      mediaArtist,
      mediaAlbum,
      albumArt,
      canPause,
      canPlay,
      canSeek,
      canSetVolume,
      canMute,
      canPrevious,
      canNext,
      canShuffle,
      canRepeat,
    };
  }, [entity, connection]);

  useEffect(() => {
    if (entity?.attributes?.volume_level !== undefined) {
      setVolume(entity.attributes.volume_level * 100);
    }
  }, [entity]);

  const callService = useCallback(async (service: string, data?: any) => {
    if (!client || !entity) {
      toast.error("Client non connecté");
      return;
    }

    try {
      await client.callService("media_player", service, data, { entity_id: entity.entity_id });
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle");
    }
  }, [client, entity]);

  const handlePrevious = useCallback(() => {
    setPending(p => ({ ...p, previous: true }));
    callService("media_previous_track");
  }, [callService]);

  const handleNext = useCallback(() => {
    setPending(p => ({ ...p, next: true }));
    callService("media_next_track");
  }, [callService]);

  const handleShuffleToggle = useCallback(() => {
    if (!entity) return;
    setPending(p => ({ ...p, shuffle: true }));
    // Cast strict pour éviter le problème iOS
    const newShuffle = entity.attributes.shuffle !== true;
    callService("shuffle_set", { shuffle: newShuffle });
  }, [callService, entity]);

  const handleRepeatCycle = useCallback(() => {
    if (!entity) return;
    setPending(p => ({ ...p, repeat: true }));
    const currentMode = (entity.attributes.repeat as "off" | "all" | "one") || "off";
    const nextMode = currentMode === "off" ? "all" : currentMode === "all" ? "one" : "off";
    callService("repeat_set", { repeat: nextMode });
  }, [callService, entity]);

  const handleSelectSource = useCallback(async (source: string) => {
    if (!entity) return;
    try {
      await client.callService("media_player", "select_source", 
        { source }, 
        { entity_id: entity.entity_id }
      );
      toast.success("Favori sélectionné");
    } catch (error) {
      console.error("Erreur lors de la sélection du favori:", error);
      toast.error("Erreur lors de la sélection du favori");
    }
  }, [client, entity]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
  }, []);

  const handleVolumeChangeEnd = useCallback((value: number[]) => {
    const volumeLevel = value[0] / 100;
    callService("volume_set", { volume_level: volumeLevel });
  }, [callService]);

  const handleMute = useCallback(() => {
    if (!entityData) return;
    callService("volume_mute", { is_volume_muted: !entityData.isMuted });
  }, [callService, entityData]);

  const handleNavigateToMaster = useCallback((masterEntityId: string) => {
    navigate(`/media-player/${encodeURIComponent(masterEntityId)}`);
  }, [navigate]);

  // IMPORTANT: Tous les hooks doivent être appelés AVANT tout early return
  // pour éviter l'erreur React #310 au retour d'arrière-plan iOS
  
  // Timeline hook pour la barre de progression
  const {
    position,
    duration,
    state: playerState,
    phase,
    isDragging,
    handleSeekStart,
    handleSeekChange,
    handleSeekEnd,
    beginPendingPlay,
    beginPendingPause,
  } = useMediaPlayerTimeline(client, entity);

  // Hook de contrôle fiable pour play/pause
  const mediaState = (entity?.state as "playing" | "paused" | "idle" | "off" | "standby" | "buffering" | "unavailable") || "idle";
  const {
    play,
    pause,
    inFlight: playPauseInFlight,
  } = useMediaPlayerControls(client, decodedEntityId, mediaState);
  
  // Récupérer le nom de la pièce - DOIT être avant le early return
  const areaName = useMemo(() => {
    if (!entityReg) return null;
    
    // D'abord essayer area_id directement
    let areaId = entityReg.area_id;
    
    // Sinon chercher via device_id
    if (!areaId && entityReg.device_id) {
      const device = devices.find((d) => d.id === entityReg.device_id);
      if (device) {
        areaId = device.area_id;
      }
    }
    
    // Trouver l'area correspondante
    if (areaId) {
      const area = areas.find((a) => a.area_id === areaId);
      return area?.name || null;
    }
    
    return null;
  }, [entityReg, devices, areas]);

  // Handler play/pause avec gestion de phase
  const handlePlayPause = useCallback(async () => {
    if (!entityData) return;
    
    // Marquer la phase immédiatement pour geler/préparer la timeline
    if (entityData.isPlaying && entityData.canPause) {
      beginPendingPause();
      await pause();
    } else if (entityData.canPlay) {
      beginPendingPlay();
      await play();
    }
  }, [entityData, beginPendingPause, beginPendingPlay, pause, play]);

  // Réinitialiser les états pending quand l'entité change
  useEffect(() => {
    setPending({
      playPause: playPauseInFlight, // Piloté par le hook de contrôle
      previous: false,
      next: false,
      shuffle: false,
      repeat: false,
    });
  }, [entity?.state, entity?.attributes.shuffle, entity?.attributes.repeat, playPauseInFlight]);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };


  if (!entity || !entityData) {
    return (
      <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
        <TopBar />
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <p className="text-muted-foreground">Appareil introuvable</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const { attributes, isPlaying, isMuted, mediaTitle, mediaArtist, mediaAlbum, albumArt, canPause, canPlay, canSetVolume, canMute, canPrevious, canNext, canShuffle, canRepeat } = entityData;

  const title = areaName || (entity?.attributes.friendly_name ?? "Chambre");

  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title={title} />
      
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour
        </Button>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 pb-4">

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
                
                {/* Timeline overlay */}
                {duration > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 space-y-1.5">
                    <Slider
                      value={[position]}
                      max={duration}
                      step={1}
                      onPointerDown={handleSeekStart}
                      onValueChange={(values) => handleSeekChange(values[0])}
                      onPointerUp={handleSeekEnd}
                      disabled={playerState === "buffering"}
                      className={cn(
                        "cursor-pointer",
                        isDragging && "cursor-grabbing"
                      )}
                      style={{ touchAction: "none" }}
                    />
                    <div className="flex justify-between text-xs text-slate-700 dark:text-white/90 font-medium">
                      <span>{formatTime(position)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
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
        <div className="mb-6">
          <MediaPlayerControls
            isPlaying={isPlaying}
            shuffle={attributes.shuffle === true}
            repeat={(attributes.repeat as "off" | "all" | "one") || "off"}
            canPlay={canPlay}
            canPause={canPause}
            canPrevious={canPrevious}
            canNext={canNext}
            canShuffle={canShuffle}
            canRepeat={canRepeat}
            onPlayPause={handlePlayPause}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onShuffleToggle={handleShuffleToggle}
            onRepeatCycle={handleRepeatCycle}
            pending={pending}
          />
        </div>

        {/* Volume & Zones Sonos */}
        <div className="mb-6">
          <SonosZoneManager 
            entity={entity}
            client={client}
            onNavigateToMaster={handleNavigateToMaster}
          />
        </div>

        {/* Bibliothèque Sonos (Browse Media) */}
        <div className="mb-6">
          <SonosBrowser 
            client={client}
            entityId={decodedEntityId}
            connectionUrl={connection?.url}
          />
        </div>

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
