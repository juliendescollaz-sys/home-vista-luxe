import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Music, Pause, Play, Loader2, SkipBack, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { useHAStore } from "@/store/useHAStore";
import { useMediaPlayerTimeline } from "@/hooks/useMediaPlayerTimeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaPlayerCardProps {
  entity: HAEntity;
}

export const MediaPlayerCard = ({ entity }: MediaPlayerCardProps) => {
  const navigate = useNavigate();
  const connection = useHAStore((state) => state.connection);
  const client = useHAStore((state) => state.client);
  const { state, attributes } = entity;

  const {
    position,
    duration,
    state: playerState,
    isDragging,
    handlePlayPause,
    handleSeekStart,
    handleSeekChange,
    handleSeekEnd,
  } = useMediaPlayerTimeline(client, entity);

  const isPlaying = playerState === "playing";
  const isBuffering = playerState === "buffering";
  const mediaTitle = attributes.media_title || "Aucun média";
  const mediaArtist = attributes.media_artist || "";
  const entityPictureLocal = attributes.entity_picture_local;
  const entityPicture = entityPictureLocal || attributes.entity_picture;
  const albumArt = entityPicture && connection?.url 
    ? `${connection.url}${entityPicture}` 
    : entityPicture;

  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Ne pas naviguer si on clique sur les contrôles
    if ((e.target as HTMLElement).closest("[data-control]")) {
      return;
    }
    navigate(`/media-player/${encodeURIComponent(entity.entity_id)}`);
  };

  const handlePrevious = async () => {
    if (!client) return;
    try {
      await client.callService("media_player", "media_previous_track", undefined, {
        entity_id: entity.entity_id,
      });
    } catch (error) {
      console.error("Erreur previous:", error);
    }
  };

  const handleNext = async () => {
    if (!client) return;
    try {
      await client.callService("media_player", "media_next_track", undefined, {
        entity_id: entity.entity_id,
      });
    } catch (error) {
      console.error("Erreur next:", error);
    }
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 relative"
      onClick={handleCardClick}
    >
      {/* Background avec jaquette */}
      {albumArt && (
        <div className="absolute inset-0">
          <img
            src={albumArt}
            alt={mediaTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95 backdrop-blur-sm" />
        </div>
      )}

      <div className="relative p-4 space-y-3">
        {/* Header: Jaquette + Titre/Artiste */}
        <div className="flex items-center gap-4">
          {/* Jaquette */}
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted/50 backdrop-blur-sm border border-border/50">
            {albumArt ? (
              <img
                src={albumArt}
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Titre et artiste */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isBuffering ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
              ) : isPlaying ? (
                <Play className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
              ) : (
                <Pause className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{mediaTitle}</span>
            </div>
            {mediaArtist && (
              <p className="text-xs text-muted-foreground truncate">
                {mediaArtist}
              </p>
            )}
          </div>
        </div>

        {/* Timeline interactive */}
        {duration > 0 && (
          <div className="space-y-1.5" data-control>
            <Slider
              value={[position]}
              max={duration}
              step={1}
              onPointerDown={handleSeekStart}
              onValueChange={(values) => handleSeekChange(values[0])}
              onPointerUp={handleSeekEnd}
              disabled={isBuffering}
              className={cn(
                "cursor-pointer",
                isDragging && "cursor-grabbing"
              )}
              style={{ touchAction: "none" }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Contrôles */}
        <div className="flex items-center justify-center gap-2" data-control>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevious}
            disabled={isBuffering}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            className="h-10 w-10"
            onClick={handlePlayPause}
            disabled={isBuffering}
          >
            {isBuffering ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
            disabled={isBuffering}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
