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
  size?: "default" | "panel";
}

export const MediaPlayerCard = ({ entity, floor, area, size = "default" }: MediaPlayerCardProps) => {
  const isPanel = size === "panel";
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


  // Tailles selon le mode panel
  const albumSize = isPanel ? "w-16 h-16" : "w-14 h-14";
  const musicIconSize = isPanel ? "h-8 w-8" : "h-7 w-7";
  const titleSize = isPanel ? "text-lg" : "text-base";
  const artistSize = isPanel ? "text-base" : "text-sm";
  const padding = isPanel ? "p-5 pt-12" : "p-4 pt-10";
  const gap = isPanel ? "gap-4 mb-5" : "gap-3 mb-4";
  const playBtnSize = isPanel ? "h-11 w-11" : "h-9 w-9";
  const playIconSize = isPanel ? "h-6 w-6" : "h-5 w-5";
  const favBtnSize = isPanel ? "h-9 w-9" : "h-7 w-7";
  const favIconSize = isPanel ? "h-5 w-5" : "h-4 w-4";
  const timeTextSize = isPanel ? "text-sm" : "text-xs";

  return (
    <Card
      className="overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50 relative"
      onClick={handleCardClick}
    >
      <LocationBadge floor={floor} area={area} />

      <div className={padding}>
        <div className={`mt-1 flex items-start ${gap}`}>
          {/* Jaquette */}
          <div className={`${albumSize} rounded-xl overflow-hidden flex-shrink-0 bg-muted/50 backdrop-blur-sm border border-border/50`}>
            {albumArt ? (
              <img
                src={albumArt}
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className={`${musicIconSize} text-muted-foreground`} />
              </div>
            )}
          </div>

          {/* Titre et artiste */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className={`font-semibold ${titleSize} truncate mb-0.5`}>{mediaTitle}</h3>
            {mediaArtist && (
              <p className={`${artistSize} text-muted-foreground truncate`}>
                {mediaArtist}
              </p>
            )}
          </div>

          {/* Play/Pause et Favoris */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              disabled={playPauseInFlight}
              className={`${playBtnSize} bg-transparent active:bg-accent/50 active:scale-95 transition-all`}
              data-control
            >
              {playPauseInFlight || isBuffering ? (
                <Loader2 className={`${playIconSize} animate-spin text-primary`} />
              ) : isPlaying ? (
                <Pause className={`${playIconSize} text-primary`} />
              ) : (
                <Play className={`${playIconSize} text-muted-foreground`} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`${favBtnSize} bg-transparent active:bg-accent/50 active:scale-95 transition-all`}
              onClick={handleFavoriteClick}
              data-control
            >
              <Star className={`${favIconSize} ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>

        {/* Timeline interactive */}
        {duration > 0 && (
          <div className={`space-y-1.5 ${isPanel ? "pt-3" : "pt-2"} border-t border-border/30`} data-control>
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
            <div className={`flex justify-between ${timeTextSize} text-muted-foreground`}>
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
