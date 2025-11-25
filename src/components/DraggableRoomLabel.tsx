import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type DraggableRoomLabelProps = {
  floorId: string;
  areaId: string;
  roomName: string;
  // position de base (centroïde) en coordonnées normalisées 0–1
  baseX: number;
  baseY: number;
  // position custom éventuelle (issue du store) en coordonnées 0–1
  overridePos?: { x: number; y: number } | null;
  isSelected: boolean;
  onPositionChange: (x: number, y: number) => void;
  onClickRoom?: () => void;
};

export function DraggableRoomLabel({
  floorId,
  areaId,
  roomName,
  baseX,
  baseY,
  overridePos,
  isSelected,
  onPositionChange,
  onClickRoom,
}: DraggableRoomLabelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentX = overridePos?.x ?? baseX;
  const currentY = overridePos?.y ?? baseY;

  const startLongPress = () => {
    clearTimeout(longPressTimer.current!);
    longPressTimer.current = window.setTimeout(() => {
      setIsDragging(true);
    }, 450); // long-press ~450ms
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current!);
    longPressTimer.current = null;
  };

  const handlePointerDown = (
    e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>,
  ) => {
    if ("button" in e && e.button !== 0) return;
    startLongPress();
  };

  const handlePointerUp = (
    e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>,
  ) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      // court clic = sélection de la pièce
      onClickRoom?.();
    }
    setIsDragging(false);
    cancelLongPress();
  };

  const updatePositionFromEvent = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let xNorm = (clientX - rect.left) / rect.width;
    let yNorm = (clientY - rect.top) / rect.height;

    // clamp entre 0 et 1
    xNorm = Math.min(1, Math.max(0, xNorm));
    yNorm = Math.min(1, Math.max(0, yNorm));

    onPositionChange(xNorm, yNorm);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePositionFromEvent(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    updatePositionFromEvent(touch.clientX, touch.clientY);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      <button
        type="button"
        className={cn(
          "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2",
          "px-3 py-1.5 rounded-full text-[11px] font-medium",
          "shadow-lg border transition-all select-none",
          isDragging
            ? "bg-primary text-primary-foreground border-primary scale-110 cursor-grabbing"
            : isSelected
            ? "bg-primary text-primary-foreground border-primary scale-110"
            : "bg-background/90 text-foreground border-border/60 hover:bg-primary hover:text-primary-foreground hover:scale-105 backdrop-blur cursor-pointer",
        )}
        style={{
          left: `${currentX * 100}%`,
          top: `${currentY * 100}%`,
        }}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
          if (!isDragging) cancelLongPress();
        }}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
      >
        {roomName}
      </button>
    </div>
  );
}
