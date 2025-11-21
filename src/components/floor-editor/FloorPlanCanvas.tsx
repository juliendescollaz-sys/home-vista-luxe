import { useEffect, useRef, useState } from "react";
import { HomeRoom } from "@/store/useHomeProjectStore";

interface Room extends HomeRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

interface FloorPlanCanvasProps {
  rooms: HomeRoom[];
  onRoomsUpdate: (rooms: HomeRoom[]) => void;
  levelId: string;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string | null) => void;
  gridSize: number;
}

type DragMode = "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw" | null;

export const FloorPlanCanvas = ({ rooms, onRoomsUpdate, levelId, selectedRoomId, onRoomSelect, gridSize }: FloorPlanCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasRooms, setCanvasRooms] = useState<Room[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRoom, setInitialRoom] = useState<Room | null>(null);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 400;
  const ROOM_MIN_SIZE = 60;
  const HANDLE_SIZE = 12;
  const HANDLE_HITBOX = 20;

  // Initialiser les pièces avec positions par défaut
  useEffect(() => {
    const levelRooms = rooms.filter((r) => r.levelId === levelId);
    const initializedRooms: Room[] = levelRooms.map((room, index) => ({
      ...room,
      x: room.x ?? 100 + (index % 3) * 200,
      y: room.y ?? 100 + Math.floor(index / 3) * 200,
      width: room.width ?? 150,
      height: room.height ?? 120,
      rotation: room.rotation ?? 0,
      zIndex: room.zIndex ?? index,
    }));
    setCanvasRooms(initializedRooms);
  }, [rooms, levelId]);

  // Dessiner le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Nettoyer
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grille
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Dessiner les pièces triées par zIndex
    const sortedRooms = [...canvasRooms].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    
    sortedRooms.forEach((room) => {
      const isSelected = room.id === selectedRoomId;

      // Rectangle de la pièce
      ctx.fillStyle = isSelected ? "hsl(var(--primary) / 0.2)" : "hsl(var(--muted) / 0.8)";
      ctx.strokeStyle = isSelected ? "hsl(var(--primary))" : "hsl(var(--border))";
      ctx.lineWidth = isSelected ? 4 : 1;
      ctx.fillRect(room.x, room.y, room.width, room.height);
      ctx.strokeRect(room.x, room.y, room.width, room.height);

      // Nom de la pièce
      ctx.fillStyle = isSelected ? "hsl(var(--primary))" : "#1a1a1a";
      ctx.font = isSelected ? "bold 14px sans-serif" : "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        room.name || "Sans nom",
        room.x + room.width / 2,
        room.y + room.height / 2
      );

      // Poignées de redimensionnement si sélectionné
      if (isSelected) {
        ctx.fillStyle = "hsl(var(--primary))";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        
        // Sud-Est
        ctx.fillRect(
          room.x + room.width - HANDLE_SIZE / 2,
          room.y + room.height - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        ctx.strokeRect(
          room.x + room.width - HANDLE_SIZE / 2,
          room.y + room.height - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        
        // Sud-Ouest
        ctx.fillRect(
          room.x - HANDLE_SIZE / 2,
          room.y + room.height - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        ctx.strokeRect(
          room.x - HANDLE_SIZE / 2,
          room.y + room.height - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        
        // Nord-Est
        ctx.fillRect(
          room.x + room.width - HANDLE_SIZE / 2,
          room.y - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        ctx.strokeRect(
          room.x + room.width - HANDLE_SIZE / 2,
          room.y - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        
        // Nord-Ouest
        ctx.fillRect(room.x - HANDLE_SIZE / 2, room.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(room.x - HANDLE_SIZE / 2, room.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      }
    });
  }, [canvasRooms, selectedRoomId, gridSize]);

  const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize;

  const getRoomAtPosition = (x: number, y: number): Room | null => {
    for (let i = canvasRooms.length - 1; i >= 0; i--) {
      const room = canvasRooms[i];
      if (x >= room.x && x <= room.x + room.width && y >= room.y && y <= room.y + room.height) {
        return room;
      }
    }
    return null;
  };

  const getResizeHandle = (room: Room, x: number, y: number): DragMode => {
    const margin = HANDLE_HITBOX / 2;
    // Sud-Est
    if (
      x >= room.x + room.width - margin &&
      x <= room.x + room.width + margin &&
      y >= room.y + room.height - margin &&
      y <= room.y + room.height + margin
    ) {
      return "resize-se";
    }
    // Sud-Ouest
    if (
      x >= room.x - margin &&
      x <= room.x + margin &&
      y >= room.y + room.height - margin &&
      y <= room.y + room.height + margin
    ) {
      return "resize-sw";
    }
    // Nord-Est
    if (
      x >= room.x + room.width - margin &&
      x <= room.x + room.width + margin &&
      y >= room.y - margin &&
      y <= room.y + margin
    ) {
      return "resize-ne";
    }
    // Nord-Ouest
    if (x >= room.x - margin && x <= room.x + margin && y >= room.y - margin && y <= room.y + margin) {
      return "resize-nw";
    }
    return null;
  };

  const moveRoomForward = () => {
    if (!selectedRoomId) return;
    const maxZ = Math.max(...canvasRooms.map(r => r.zIndex ?? 0));
    setCanvasRooms(prev => 
      prev.map(r => r.id === selectedRoomId ? { ...r, zIndex: maxZ + 1 } : r)
    );
    onRoomsUpdate(canvasRooms.map(r => r.id === selectedRoomId ? { ...r, zIndex: (r.zIndex ?? 0) + 1 } : r));
  };

  const moveRoomBackward = () => {
    if (!selectedRoomId) return;
    const minZ = Math.min(...canvasRooms.map(r => r.zIndex ?? 0));
    setCanvasRooms(prev => 
      prev.map(r => r.id === selectedRoomId ? { ...r, zIndex: Math.max(0, minZ - 1) } : r)
    );
    onRoomsUpdate(canvasRooms.map(r => r.id === selectedRoomId ? { ...r, zIndex: Math.max(0, (r.zIndex ?? 0) - 1) } : r));
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const room = getRoomAtPosition(x, y);
    if (room) {
      onRoomSelect(room.id);
      setInitialRoom({ ...room });

      const handle = getResizeHandle(room, x, y);
      if (handle) {
        setDragMode(handle);
      } else {
        setDragMode("move");
      }

      setIsDragging(true);
      setDragStart({ x, y });
    } else {
      onRoomSelect(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerDown(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Changer le curseur selon la position
    if (selectedRoomId) {
      const room = canvasRooms.find((r) => r.id === selectedRoomId);
      if (room) {
        const handle = getResizeHandle(room, x, y);
        if (handle) {
          if (handle === "resize-se" || handle === "resize-nw") {
            canvas.style.cursor = "nwse-resize";
          } else {
            canvas.style.cursor = "nesw-resize";
          }
        } else if (
          x >= room.x &&
          x <= room.x + room.width &&
          y >= room.y &&
          y <= room.y + room.height
        ) {
          canvas.style.cursor = "move";
        } else {
          canvas.style.cursor = "default";
        }
      }
    } else {
      canvas.style.cursor = "default";
    }

    if (!isDragging || !selectedRoomId || !initialRoom) return;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setCanvasRooms((prevRooms) =>
      prevRooms.map((room) => {
        if (room.id !== selectedRoomId) return room;

        if (dragMode === "move") {
          return {
            ...room,
            x: Math.max(0, Math.min(CANVAS_WIDTH - room.width, snapToGrid(initialRoom.x + deltaX))),
            y: Math.max(0, Math.min(CANVAS_HEIGHT - room.height, snapToGrid(initialRoom.y + deltaY))),
          };
        } else if (dragMode === "resize-se") {
          const newWidth = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.width + deltaX));
          const newHeight = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.height + deltaY));
          return { ...room, width: newWidth, height: newHeight };
        } else if (dragMode === "resize-sw") {
          const newWidth = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.width - deltaX));
          const newHeight = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.height + deltaY));
          const newX = initialRoom.x + initialRoom.width - newWidth;
          return { ...room, x: newX, width: newWidth, height: newHeight };
        } else if (dragMode === "resize-ne") {
          const newWidth = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.width + deltaX));
          const newHeight = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.height - deltaY));
          const newY = initialRoom.y + initialRoom.height - newHeight;
          return { ...room, y: newY, width: newWidth, height: newHeight };
        } else if (dragMode === "resize-nw") {
          const newWidth = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.width - deltaX));
          const newHeight = Math.max(ROOM_MIN_SIZE, snapToGrid(initialRoom.height - deltaY));
          const newX = initialRoom.x + initialRoom.width - newWidth;
          const newY = initialRoom.y + initialRoom.height - newHeight;
          return { ...room, x: newX, y: newY, width: newWidth, height: newHeight };
        }

        return room;
      })
    );
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      // Sauvegarder les changements
      onRoomsUpdate(canvasRooms);
    }
    setIsDragging(false);
    setDragMode(null);
    setInitialRoom(null);
  };

  const handleMouseUp = () => {
    handlePointerUp();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handlePointerUp();
  };

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="border border-border rounded-lg bg-background shadow-lg mx-auto"
        style={{ touchAction: 'none' }}
      />
      {selectedRoomId && (
        <div className="flex justify-center gap-2">
          <button
            onClick={moveRoomBackward}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md"
          >
            Arrière-plan
          </button>
          <button
            onClick={moveRoomForward}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md"
          >
            Premier plan
          </button>
        </div>
      )}
    </div>
  );
};
