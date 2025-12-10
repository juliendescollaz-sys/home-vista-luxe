// src/components/DraggableRoomLabel.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DraggableRoomLabelProps {
  floorId: string;
  areaId: string;
  roomName: string;
  /** Position de base (0–1) en X/Y, calculée à partir du centroïde du polygone */
  baseX: number;
  baseY: number;
  /** Position override (0–1) sauvegardée dans le store, si existante */
  overridePos?: { x: number; y: number };
  /** True si cette pièce est actuellement sélectionnée (sidebar ouverte) */
  isSelected: boolean;
  /** Callback pour persister la nouvelle position dans le store */
  onPositionChange: (x: number, y: number) => void;
  /** Callback lorsqu'on « clique » sur la pièce (ou drag très court) */
  onClickRoom: () => void;
}

/**
 * Label draggable pour une pièce sur le plan.
 */
export const DraggableRoomLabel: React.FC<DraggableRoomLabelProps> = ({
  floorId,
  areaId,
  roomName,
  baseX,
  baseY,
  overridePos,
  isSelected,
  onPositionChange,
  onClickRoom,
}) => {
  const labelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Position effective (en coordonnées relatives 0–1)
  const [pos, setPos] = useState<{ x: number; y: number }>({
    x: overridePos?.x ?? baseX,
    y: overridePos?.y ?? baseY,
  });

  // Mettre à jour si le store change (ex: reset)
  useEffect(() => {
    setPos({
      x: overridePos?.x ?? baseX,
      y: overridePos?.y ?? baseY,
    });
  }, [overridePos?.x, overridePos?.y, baseX, baseY]);

  // Drag state refs (pas de state React pour éviter les re-renders pendant le drag)
  const isDraggingRef = useRef(false);
  const startClientRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const maxDistanceRef = useRef(0);
  const containerRectRef = useRef<DOMRect | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const label = labelRef.current;
    if (!label) return;

    const container = label.parentElement;
    if (!container) return;

    // Initialiser le drag state
    isDraggingRef.current = true;
    startClientRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: pos.x, y: pos.y };
    maxDistanceRef.current = 0;
    containerRef.current = container;
    containerRectRef.current = container.getBoundingClientRect();

    // Ajouter les listeners au document pour capturer tous les mouvements
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current || !containerRectRef.current) return;

    const dx = e.clientX - startClientRef.current.x;
    const dy = e.clientY - startClientRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Tracker la distance max parcourue
    if (distance > maxDistanceRef.current) {
      maxDistanceRef.current = distance;
    }

    // Calculer nouvelle position relative
    const rect = containerRectRef.current;
    const newX = startPosRef.current.x + dx / Math.max(rect.width, 1);
    const newY = startPosRef.current.y + dy / Math.max(rect.height, 1);

    // Clamp 0–1
    const clampedX = Math.min(0.98, Math.max(0.02, newX));
    const clampedY = Math.min(0.98, Math.max(0.02, newY));

    setPos({ x: clampedX, y: clampedY });
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;

    // Cleanup listeners
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    document.removeEventListener("pointercancel", handlePointerUp);

    const wasDrag = maxDistanceRef.current > 15;
    isDraggingRef.current = false;

    if (wasDrag) {
      // C'était un drag → persister la position
      onPositionChange(pos.x, pos.y);
    } else {
      // C'était un tap → ouvrir la sidebar
      onClickRoom();
    }
  }, [onPositionChange, onClickRoom, pos.x, pos.y]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const left = `${pos.x * 100}%`;
  const top = `${pos.y * 100}%`;

  return (
    <div
      ref={labelRef}
      className={cn(
        "absolute pointer-events-auto select-none",
        "transform -translate-x-1/2 -translate-y-1/2",
      )}
      style={{ left, top, touchAction: "none" }}
      onPointerDown={handlePointerDown}
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
