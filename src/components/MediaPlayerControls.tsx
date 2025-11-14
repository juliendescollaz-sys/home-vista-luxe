import { Play, Pause, SkipForward, SkipBack, Repeat, Repeat1, Shuffle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

// Helper: Transport button (prev/next/play)
function TransportButton({ 
  icon: Icon, 
  onPress, 
  disabled, 
  pending = false, 
  size = "sm", 
  primary = false 
}: {
  icon: any;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  size?: "sm" | "lg";
  primary?: boolean;
}) {
  const dim = size === "lg" ? "h-[70px] w-[70px]" : "h-12 w-12";
  const iconSize = size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const rounded = size === "lg" ? "rounded-full" : "rounded-xl";

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={cn(
        dim,
        rounded,
        "flex items-center justify-center transition-all duration-200",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        disabled
          ? "bg-muted"
          : primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          : "bg-card border border-border hover:bg-accent"
      )}
    >
      {pending ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : (
        <Icon className={iconSize} />
      )}
    </button>
  );
}

// Helper: Toggle button (shuffle on/off)
function ToggleButton({ 
  icon: Icon, 
  active, 
  onPress, 
  disabled, 
  pending = false 
}: {
  icon: any;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={cn(
        "flex-1 h-11 rounded-xl transition-all duration-200",
        "flex items-center justify-center gap-2",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        disabled
          ? "bg-muted border border-border"
          : active
          ? "bg-primary/10 border-2 border-primary hover:bg-primary/15"
          : "bg-card/50 border border-border/50 hover:bg-card"
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground/60")} />
          <span className={cn("text-sm font-medium", active ? "text-primary" : "text-muted-foreground/60")}>
            {active ? "ON" : "OFF"}
          </span>
        </>
      )}
    </button>
  );
}

// Helper: Repeat button (off/all/one)
function RepeatButton({ 
  repeat, 
  onPress, 
  disabled, 
  pending = false 
}: {
  repeat: "off" | "all" | "one";
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  const active = repeat !== "off";
  const Icon = repeat === "one" ? Repeat1 : Repeat;
  const label = repeat === "off" ? "OFF" : repeat === "all" ? "ALL" : "ONE";

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={cn(
        "flex-1 h-11 rounded-xl transition-all duration-200",
        "flex items-center justify-center gap-2",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        disabled
          ? "bg-muted border border-border"
          : active
          ? "bg-primary/10 border-2 border-primary hover:bg-primary/15"
          : "bg-card/50 border border-border/50 hover:bg-card"
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground/60")} />
          <span className={cn("text-sm font-medium", active ? "text-primary" : "text-muted-foreground/60")}>
            {label}
          </span>
        </>
      )}
    </button>
  );
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
    <Card className="p-6 space-y-4">
      {/* Transport controls */}
      <div className="flex items-center justify-center gap-3">
        {canPrevious && (
          <TransportButton
            icon={SkipBack}
            onPress={onPrevious}
            disabled={!canPrevious || pending.previous}
            pending={pending.previous}
          />
        )}
        
        <TransportButton
          icon={isPlaying ? Pause : Play}
          onPress={onPlayPause}
          disabled={(!canPlay && !canPause) || pending.playPause}
          pending={pending.playPause}
          size="lg"
          primary
        />
        
        {canNext && (
          <TransportButton
            icon={SkipForward}
            onPress={onNext}
            disabled={!canNext || pending.next}
            pending={pending.next}
          />
        )}
      </div>

      {/* Options: Shuffle & Repeat */}
      {(canShuffle || canRepeat) && (
        <div className="flex gap-3">
          {canShuffle && (
            <ToggleButton
              icon={Shuffle}
              active={shuffle}
              onPress={onShuffleToggle}
              disabled={!canShuffle || pending.shuffle}
              pending={pending.shuffle}
            />
          )}
          {canRepeat && (
            <RepeatButton
              repeat={repeat}
              onPress={onRepeatCycle}
              disabled={!canRepeat || pending.repeat}
              pending={pending.repeat}
            />
          )}
        </div>
      )}
    </Card>
  );
};
