import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Slider } from "@/components/ui/slider";

interface VolumeSliderProps {
  entityId: string;
  volumeLevel: number;
  onVolumeChange: (entityId: string, value: number) => void;
  className?: string;
}

function createThrottled(fn: (v: number) => void, ms = 180) {
  let timer: NodeJS.Timeout | null = null;
  let lastValue: number | null = null;
  
  return (v: number) => {
    lastValue = v;
    if (timer !== null) return;
    
    fn(lastValue);
    timer = setTimeout(() => {
      timer = null;
      if (lastValue !== null) fn(lastValue);
    }, ms);
  };
}

export function VolumeSlider({ entityId, volumeLevel, onVolumeChange, className }: VolumeSliderProps) {
  const [localValue, setLocalValue] = useState(volumeLevel * 100);
  const [isDragging, setIsDragging] = useState(false);
  const suppressKey = useRef<string | null>(null);
  const endTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync with HA only when not dragging and not suppressed
  useEffect(() => {
    if (!isDragging && suppressKey.current !== entityId) {
      setLocalValue(volumeLevel * 100);
    }
  }, [volumeLevel, isDragging, entityId]);

  const throttledSend = useMemo(
    () =>
      createThrottled((v: number) => {
        onVolumeChange(entityId, v / 100);
      }, 180),
    [entityId, onVolumeChange]
  );

  const handlePointerDown = useCallback(() => {
    setIsDragging(true);
    suppressKey.current = entityId;
    if (endTimer.current) {
      clearTimeout(endTimer.current);
      endTimer.current = null;
    }
  }, [entityId]);

  const handleValueChange = useCallback(
    (value: number[]) => {
      const newValue = value[0];
      setLocalValue(newValue);
      throttledSend(newValue);
    },
    [throttledSend]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    endTimer.current = setTimeout(() => {
      suppressKey.current = null;
    }, 400);
  }, []);

  return (
    <div 
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      <Slider
        value={[localValue]}
        onValueChange={handleValueChange}
        max={100}
        step={1}
        className="flex-1"
      />
    </div>
  );
}
