import { Play, Pause, SkipForward, SkipBack, Repeat, Repeat1, Shuffle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MediaPlayerControlsProps {
  isPlaying: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  canPlay: boolean;
  canPause: boolean;
  canPrevious: boolean;
  canNext: boolean;
  canShuffle: boolean;
  canRepeat: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onShuffleToggle: () => void;
  onRepeatCycle: () => void;
  pending?: {
    playPause?: boolean;
    previous?: boolean;
    next?: boolean;
    shuffle?: boolean;
    repeat?: boolean;
  };
}

export const MediaPlayerControls = ({
  isPlaying,
  shuffle,
  repeat,
  canPlay,
  canPause,
  canPrevious,
  canNext,
  canShuffle,
  canRepeat,
  onPlayPause,
  onPrevious,
  onNext,
  onShuffleToggle,
  onRepeatCycle,
  pending = {},
}: MediaPlayerControlsProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-center gap-3">
        {/* Shuffle Button */}
        {canShuffle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            onClick={onShuffleToggle}
            disabled={pending.shuffle}
          >
            {pending.shuffle ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Shuffle 
                className={`h-5 w-5 transition-colors ${
                  shuffle 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              />
            )}
          </Button>
        )}

        {/* Previous Track Button */}
        {canPrevious && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            onClick={onPrevious}
            disabled={pending.previous}
          >
            {pending.previous ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            ) : (
              <SkipBack className="h-6 w-6 text-foreground" />
            )}
          </Button>
        )}

        {/* Play/Pause Button */}
        <Button
          variant="default"
          size="icon"
          className="h-16 w-16 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
          onClick={onPlayPause}
          disabled={(!canPlay && !canPause) || pending.playPause}
        >
          {pending.playPause ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8 ml-1" />
          )}
        </Button>

        {/* Next Track Button */}
        {canNext && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            onClick={onNext}
            disabled={pending.next}
          >
            {pending.next ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            ) : (
              <SkipForward className="h-6 w-6 text-foreground" />
            )}
          </Button>
        )}

        {/* Repeat Button */}
        {canRepeat && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 relative disabled:opacity-50"
            onClick={onRepeatCycle}
            disabled={pending.repeat}
          >
            {pending.repeat ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : repeat === "one" ? (
              <Repeat1 
                className={`h-5 w-5 transition-colors ${
                  repeat === "one" 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              />
            ) : (
              <Repeat 
                className={`h-5 w-5 transition-colors ${
                  repeat === "all" 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              />
            )}
            {repeat !== "off" && !pending.repeat && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            )}
          </Button>
        )}
      </div>

      {/* State Indicators */}
      <div className="flex items-center justify-center gap-3 mt-4 text-xs text-muted-foreground">
        {shuffle && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
            Aléatoire
          </span>
        )}
        {repeat === "all" && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
            Répéter tout
          </span>
        )}
        {repeat === "one" && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
            Répéter une
          </span>
        )}
      </div>
    </Card>
  );
};
