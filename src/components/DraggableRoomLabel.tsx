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

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
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

      const rect = state.containerRect;
      const newX = state.startPosX + dx / Math.max(rect.width, 1);
      const newY = state.startPosY + dy / Math.max(rect.height, 1);

      const clampedX = Math.min(0.98, Math.max(0.02, newX));
      const clampedY = Math.min(0.98, Math.max(0.02, newY));

      state.currentPosX = clampedX;
      state.currentPosY = clampedY;
      setPos({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging) return;

      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);

      const wasDrag = state.maxDistance > 15;
      state.isDragging = false;

      if (wasDrag) {
        onPositionChangeRef.current(state.currentPosX, state.currentPosY);
      } else {
        // Prevent synthetic click event from firing after pointerup (Panel mode issue)
        e.preventDefault();
        e.stopPropagation();
        
        // Use setTimeout to ensure the click happens after event processing
        setTimeout(() => {
          onClickRoomRef.current();
        }, 0);
      }
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
        "absolute pointer-events-auto select-none",
        "transform -translate-x-1/2 -translate-y-1/2",
      )}
      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, touchAction: "none" }}
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
