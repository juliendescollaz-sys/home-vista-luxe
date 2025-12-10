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

  // Ref pour stocker la position courante pendant le drag (évite les problèmes de state async)
  const currentPosRef = useRef(pos);
  useEffect(() => {
    currentPosRef.current = pos;
  }, [pos]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const label = labelRef.current;
    if (!label) return;

    const container = label.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPosX = currentPosRef.current.x;
    const startPosY = currentPosRef.current.y;
    let moved = false;

    const handleMove = (event: PointerEvent) => {
      const dx = event.clientX - startClientX;
      const dy = event.clientY - startClientY;

      // Seuil pour distinguer drag vs clic
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 4) {
        moved = true;
      }

      // Calculer la nouvelle position relative à la position de départ (pas de cumul)
      const newX = startPosX + dx / Math.max(rect.width, 1);
      const newY = startPosY + dy / Math.max(rect.height, 1);

      // Clamp 0–1
      const clampedX = Math.min(0.98, Math.max(0.02, newX));
      const clampedY = Math.min(0.98, Math.max(0.02, newY));

      currentPosRef.current = { x: clampedX, y: clampedY };
      setPos({ x: clampedX, y: clampedY });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);

      // Persister la position finale
      onPositionChange(currentPosRef.current.x, currentPosRef.current.y);

      // Si quasiment pas bougé → c'est un clic
      if (!moved) {
        onClickRoom();
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }, [onClickRoom, onPositionChange]);

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
