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
  /** Callback lorsqu’on « clique » sur la pièce (ou drag très court) */
  onClickRoom: () => void;
}

/**
 * Label draggable pour une pièce sur le plan.
 *
 * ⚠ IMPORTANT :
 *  - pointer-events-auto pour que les clics & drags fonctionnent
 *    même si le conteneur parent est en pointer-events-none.
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

  // Etat de drag
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    moved: false,
  });

  const finishDrag = useCallback(
    (asClickCandidate: boolean) => {
      const state = dragState.current;

      if (state.dragging) {
        state.dragging = false;

        // Persistance de la position dans le store
        onPositionChange(state.startPosX, state.startPosY);
      }

      // Si quasiment pas bougé → on considère que c’est un clic
      if (asClickCandidate && !state.moved) {
        onClickRoom();
      }
    },
    [onClickRoom, onPositionChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const label = labelRef.current;
    if (!label) return;

    const container = label.parentElement; // -> <div class="absolute inset-0 ...">
    if (!container) return;

    const rect = container.getBoundingClientRect();

    dragState.current.dragging = true;
    dragState.current.moved = false;
    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;
    dragState.current.startPosX = pos.x;
    dragState.current.startPosY = pos.y;

    const handleMove = (event: PointerEvent) => {
      if (!dragState.current.dragging) return;

      const dx = event.clientX - dragState.current.startX;
      const dy = event.clientY - dragState.current.startY;

      // Seuil pour distinguer drag vs clic
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 4) {
        dragState.current.moved = true;
      }

      const newX =
        dragState.current.startPosX + dx / Math.max(rect.width, 1);
      const newY =
        dragState.current.startPosY + dy / Math.max(rect.height, 1);

      // Clamp 0–1
      const clampedX = Math.min(0.98, Math.max(0.02, newX));
      const clampedY = Math.min(0.98, Math.max(0.02, newY));

      dragState.current.startPosX = clampedX;
      dragState.current.startPosY = clampedY;

      setPos({ x: clampedX, y: clampedY });
    };

    const handleUp = (event: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      finishDrag(true);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const left = `${pos.x * 100}%`;
  const top = `${pos.y * 100}%`;

  return (
    <div
      ref={labelRef}
      className={cn(
        "absolute pointer-events-auto select-none",
        "transform -translate-x-1/2 -translate-y-1/2",
      )}
      style={{ left, top }}
      onPointerDown={handlePointerDown}
      // Au cas où : clic simple (ex: navigation clavier / screenreader)
      onClick={(e) => {
        e.stopPropagation();
        onClickRoom();
      }}
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
