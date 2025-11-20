import { Card } from "@/components/ui/card";
import { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { Music, Pause, Play, Loader2, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { useHAStore } from "@/store/useHAStore";
import { useMediaPlayerTimeline } from "@/hooks/useMediaPlayerTimeline";
import { useMediaPlayerControls } from "@/hooks/useMediaPlayerControls";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LocationBadge } from "./LocationBadge";

interface MediaPlayerCardProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const MediaPlayerCard = ({ entity, floor, area }: MediaPlayerCardProps) => {
  const navigate = useNavigate();
  const connection = useHAStore((state) => state.connection);
  const client = useHAStore((state) => state.client);
  const { state, attributes } = entity;
  
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(entity.entity_id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  const {
    position,
    duration,
    state: playerState,
    isDragging,
    handleSeekStart,
    handleSeekChange,
    handleSeekEnd,
  } = useMediaPlayerTimeline(client, entity);

  const {
    play,
    pause,
    inFlight: playPauseInFlight,
  } = useMediaPlayerControls(
    client,
    entity.entity_id,
    entity.state as any
  );

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

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };


  return (
    <Card
      className="overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50 relative"
      onClick={handleCardClick}
    >
      <LocationBadge floor={floor} area={area} />
      
      <div className="relative pt-10 p-4">
        <div className="flex items-start gap-3">
          {/* Jaquette */}
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted/50 backdrop-blur-sm border border-border/50">
            {albumArt ? (
              <img
                src={albumArt}
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Titre et artiste */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{mediaTitle}</h3>
            {mediaArtist && (
              <p className="text-sm text-muted-foreground truncate">
                {mediaArtist}
              </p>
            )}
          </div>

          {/* Play/Pause et Favoris */}
          <div className="flex items-center gap-1 flex-shrink-0 -mt-1 -mr-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              disabled={playPauseInFlight}
              className="h-9 w-9 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
              data-control
            >
              {playPauseInFlight || isBuffering ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 text-primary" />
              ) : (
                <Play className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
              onClick={handleFavoriteClick}
              data-control
            >
              <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>

        {/* Timeline interactive */}
        {duration > 0 && (
          <div className="mt-4 space-y-1.5" data-control>
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
      </div>
    </Card>
  );
};
