// src/components/DraggableRoomLabel.tsx

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DraggableRoomLabelProps {
  floorId: string;
  areaId: string;
  roomName: string;
  baseX: number;
  baseY: number;
  overridePos?: { x: number; y: number };
  isSelected: boolean;
  onPositionChange: (x: number, y: number) => void;
  onClickRoom: () => void;
}

export const DraggableRoomLabel: React.FC<DraggableRoomLabelProps> = ({
  roomName,
  baseX,
  baseY,
  overridePos,
  isSelected,
  onPositionChange,
  onClickRoom,
}) => {
  const labelRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState<{ x: number; y: number }>({
    x: overridePos?.x ?? baseX,
    y: overridePos?.y ?? baseY,
  });

  // Sync with store changes
  useEffect(() => {
    setPos({
      x: overridePos?.x ?? baseX,
      y: overridePos?.y ?? baseY,
    });
  }, [overridePos?.x, overridePos?.y, baseX, baseY]);

  // Refs for drag state (avoid stale closures)
  const dragStateRef = useRef({
    isDragging: false,
    startClientX: 0,
    startClientY: 0,
    startPosX: 0,
    startPosY: 0,
    maxDistance: 0,
    currentPosX: 0,
    currentPosY: 0,
    containerRect: null as DOMRect | null,
    clickHandled: false,
  });

  // Keep current pos in ref for callbacks
  useEffect(() => {
    dragStateRef.current.currentPosX = pos.x;
    dragStateRef.current.currentPosY = pos.y;
  }, [pos]);

  // Refs for callbacks to avoid stale closures
  const onPositionChangeRef = useRef(onPositionChange);
  const onClickRoomRef = useRef(onClickRoom);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
    onClickRoomRef.current = onClickRoom;
  }, [onPositionChange, onClickRoom]);

  // Direct click handler as primary method for tap detection
  const handleClick = (e: React.MouseEvent) => {
    const state = dragStateRef.current;
    // Only handle click if we didn't just finish a drag
    if (state.maxDistance <= 10 && !state.clickHandled) {
      state.clickHandled = true;
      e.stopPropagation();
      onClickRoomRef.current();
      // Reset flag after a short delay
      setTimeout(() => {
        state.clickHandled = false;
      }, 100);
    }
  };

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Don't prevent default - let click events fire naturally
      e.stopPropagation();

      const container = label.parentElement;
      if (!container) return;

      const state = dragStateRef.current;
      state.isDragging = true;
      state.startClientX = e.clientX;
      state.startClientY = e.clientY;
      state.startPosX = state.currentPosX;
      state.startPosY = state.currentPosY;
      state.maxDistance = 0;
      state.clickHandled = false;
      state.containerRect = container.getBoundingClientRect();

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.containerRect) return;

      const dx = e.clientX - state.startClientX;
      const dy = e.clientY - state.startClientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > state.maxDistance) {
        state.maxDistance = distance;
      }

      // Only update position if we're actually dragging (threshold: 10px)
      if (distance > 10) {
        const rect = state.containerRect;
        const newX = state.startPosX + dx / Math.max(rect.width, 1);
        const newY = state.startPosY + dy / Math.max(rect.height, 1);

        const clampedX = Math.min(0.98, Math.max(0.02, newX));
        const clampedY = Math.min(0.98, Math.max(0.02, newY));

        state.currentPosX = clampedX;
        state.currentPosY = clampedY;
        setPos({ x: clampedX, y: clampedY });
      }
    };

    const handlePointerUp = () => {
      const state = dragStateRef.current;
      if (!state.isDragging) return;

      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);

      const wasDrag = state.maxDistance > 10;
      state.isDragging = false;

      if (wasDrag) {
        state.clickHandled = true; // Prevent click from firing
        onPositionChangeRef.current(state.currentPosX, state.currentPosY);
      }
      // For taps, let the onClick handler deal with it
    };

    label.addEventListener("pointerdown", handlePointerDown);

    return () => {
      label.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  return (
    <div
      ref={labelRef}
      className={cn(
        "absolute pointer-events-auto select-none cursor-pointer",
        "transform -translate-x-1/2 -translate-y-1/2",
      )}
      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, touchAction: "none" }}
      onClick={handleClick}
      aria-label={roomName}
      role="button"
    >
      <div
        className={cn(
          "px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm",
          "bg-background/90 backdrop-blur border-primary/40",
          "hover:bg-primary hover:text-primary-foreground transition-colors",
          isSelected && "bg-primary text-primary-foreground border-primary",
        )}
      >
        {roomName}
      </div>
    </div>
  );
};

export default DraggableRoomLabel;
