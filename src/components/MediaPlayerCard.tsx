import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Music, Pause, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useHAStore } from "@/store/useHAStore";

interface MediaPlayerCardProps {
  entity: HAEntity;
}

export const MediaPlayerCard = ({ entity }: MediaPlayerCardProps) => {
  const navigate = useNavigate();
  const connection = useHAStore((state) => state.connection);
  const { state, attributes } = entity;

  const isPlaying = state === "playing";
  const mediaTitle = attributes.media_title || "Aucun média";
  const mediaArtist = attributes.media_artist || "";
  const entityPicture = attributes.entity_picture;
  const albumArt = entityPicture && connection?.url 
    ? `${connection.url}${entityPicture}` 
    : entityPicture;
  const mediaPosition = attributes.media_position || 0;
  const mediaDuration = attributes.media_duration || 0;
  const progress = mediaDuration > 0 ? (mediaPosition / mediaDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    navigate(`/media-player/${encodeURIComponent(entity.entity_id)}`);
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 relative"
      onClick={handleClick}
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

      <div className="relative p-4 flex items-center gap-4">
        {/* Jaquette ou icône */}
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

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isPlaying ? (
              <Play className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
            ) : (
              <Pause className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{mediaTitle}</span>
          </div>
          {mediaArtist && (
            <p className="text-xs text-muted-foreground truncate mb-2">
              {mediaArtist}
            </p>
          )}

          {/* Timeline */}
          {mediaDuration > 0 && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(mediaPosition)}</span>
                <span>{formatTime(mediaDuration)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
