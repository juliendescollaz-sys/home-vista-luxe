import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

interface SortableMediaPlayerCardProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
  onOpenDetails?: (entity: HAEntity) => void;
}

export const SortableMediaPlayerCard = ({ entity, floor, area, onOpenDetails }: SortableMediaPlayerCardProps) => {
  const navigate = useNavigate();
  const connection = useHAStore((state) => state.connection);
  const client = useHAStore((state) => state.client);
  const { state, attributes } = entity;
  
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(entity.entity_id);

  const {
    attributes: sortableAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: entity.entity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
    zIndex: isSortableDragging ? 50 : 'auto',
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  const {
    position,
    duration,
    state: playerState,
    isDragging: isTimelineDragging,
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSortableDragging) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="slider"]')) {
      return;
    }
    
    if (onOpenDetails) {
      onOpenDetails(entity);
    } else {
      navigate(`/media-player/${entity.entity_id}`);
    }
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
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      {...sortableAttributes}
      {...listeners}
      className="group relative overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50 cursor-grab active:cursor-grabbing"
    >
      <LocationBadge floor={floor} area={area} />
      
      <div className="p-4 pt-10">
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted/50 backdrop-blur-sm border border-border/50">
            {albumArt ? (
              <img src={albumArt} alt={mediaTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{mediaTitle}</h3>
            {mediaArtist && <p className="text-sm text-muted-foreground truncate">{mediaArtist}</p>}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={playPauseInFlight} className="h-9 w-9 bg-transparent active:bg-accent/50 active:scale-95 transition-all">
              {playPauseInFlight || isBuffering ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 text-primary" />
              ) : (
                <Play className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-transparent active:bg-accent/50 active:scale-95 transition-all" onClick={handleFavoriteClick}>
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>

        {duration > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <Slider value={[position]} max={duration} step={1} onPointerDown={handleSeekStart} onValueChange={(values) => handleSeekChange(values[0])} onPointerUp={handleSeekEnd} disabled={isBuffering} className={cn("cursor-pointer", isTimelineDragging && "cursor-grabbing")} style={{ touchAction: "none" }} />
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
