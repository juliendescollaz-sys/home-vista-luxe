import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Music, Pause, Play, Loader2, Star, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { useHAStore } from "@/store/useHAStore";
import { useMediaPlayerTimeline } from "@/hooks/useMediaPlayerTimeline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SortableMediaPlayerCardProps {
  entity: HAEntity;
}

export const SortableMediaPlayerCard = ({ entity }: SortableMediaPlayerCardProps) => {
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
    navigate(`/media-player/${entity.entity_id}`);
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className="group relative overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50"
    >
      <div className="relative h-32">
        {albumArt ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center blur-xl opacity-40"
              style={{ backgroundImage: `url(${albumArt})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        )}
        
        <div className="relative h-full p-4 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              type="button"
              {...sortableAttributes}
              {...listeners}
              className="p-2 -ml-2 mt-1 rounded-lg transition-colors cursor-grab active:cursor-grabbing touch-none shrink-0"
              aria-label="Déplacer le lecteur"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>

            {albumArt ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg shrink-0">
                <img 
                  src={albumArt} 
                  alt={mediaTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0 pt-2">
              <h3 className="font-semibold truncate">{mediaTitle}</h3>
              {mediaArtist && (
                <p className="text-sm text-muted-foreground truncate">{mediaArtist}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
              onClick={handleFavoriteClick}
            >
              <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>

            {isBuffering ? (
              <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isPlaying ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {duration > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
              {formatTime(position)}
            </span>
            <Slider
              value={[position]}
              max={duration}
              step={1}
              onPointerDown={handleSeekStart}
              onValueChange={(values) => handleSeekChange(values[0])}
              onPointerUp={handleSeekEnd}
              className={cn(
                "flex-1 cursor-pointer",
                isTimelineDragging && "cursor-grabbing"
              )}
            />
            <span className="text-xs text-muted-foreground tabular-nums w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
