import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { useParams, useNavigate } from "react-router-dom";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const RoomDetails = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Scroll to top lors de la navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [areaId]);
  
  const client = useHAStore((state) => state.client);
  const areas = useHAStore((state) => state.areas);
  const entities = useHAStore((state) => state.entities);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const areaPhotos = useHAStore((state) => state.areaPhotos);
  const entityOrder = useHAStore((state) => state.entityOrder);
  const setEntityOrder = useHAStore((state) => state.setEntityOrder);
  
  const area = areas.find((a) => a.area_id === areaId);
  const contextId = `room-${areaId}`;
  
  // Filtrer les entités qui appartiennent à cette pièce
  // 1. Trouver les devices de cette pièce
  const roomDeviceIds = devices
    .filter((device) => device.area_id === areaId && !device.disabled_by)
    .map((device) => device.id);
  
  // 2. Trouver les entités de ces devices OU directement liées à cette pièce
  const roomEntityIds = new Set(
    entityRegistry
      .filter((reg) => 
        (reg.device_id && roomDeviceIds.includes(reg.device_id)) || 
        reg.area_id === areaId
      )
      .map((reg) => reg.entity_id)
  );
  
  // 3. Filtrer les entités complètes
  const allRoomEntities = entities.filter((entity) => 
    roomEntityIds.has(entity.entity_id)
  );

  // 4. Trouver les device_id des media_players
  const mediaPlayerDeviceIds = new Set(
    allRoomEntities
      .filter((entity) => entity.entity_id.startsWith("media_player."))
      .map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        return reg?.device_id;
      })
      .filter(Boolean)
  );

  // 5. Filtrer pour ne garder QUE les media_players et cacher toutes les autres entités du même device
  const roomEntities = allRoomEntities.filter((entity) => {
    const domain = entity.entity_id.split(".")[0];
    
    // Si c'est un media_player, toujours l'afficher
    if (domain === "media_player") return true;
    
    // Trouver le device_id de cette entité
    const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
    const deviceId = reg?.device_id;
    
    // Si cette entité appartient au même device qu'un media_player, la cacher
    if (deviceId && mediaPlayerDeviceIds.has(deviceId)) return false;
    
    // Sinon, l'afficher
    return true;
  });

  // Initialiser l'ordre si nécessaire
  useEffect(() => {
    if (roomEntities.length > 0 && (!entityOrder[contextId] || entityOrder[contextId].length === 0)) {
      setEntityOrder(contextId, roomEntities.map(e => e.entity_id));
    }
  }, [roomEntities.length, entityOrder, contextId, setEntityOrder]);

  // Trier les entités selon l'ordre personnalisé
  const sortedEntities = useMemo(() => {
    if (!entityOrder[contextId] || entityOrder[contextId].length === 0) return roomEntities;
    
    const orderMap = new Map(entityOrder[contextId].map((id, index) => [id, index]));
    return [...roomEntities].sort((a, b) => {
      const orderA = orderMap.get(a.entity_id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.entity_id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [roomEntities, entityOrder, contextId]);

  const handleToggle = async (entityId: string) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    const entity = entities.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = entityId.split(".")[0];
    const isOn = entity.state === "on";
    const service = isOn ? "turn_off" : "turn_on";

    try {
      await client.callService(domain, service, {}, { entity_id: entityId });
      toast.success(isOn ? "Éteint" : "Allumé");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle de l'appareil");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedEntities.findIndex((e) => e.entity_id === active.id);
      const newIndex = sortedEntities.findIndex((e) => e.entity_id === over.id);

      const newOrder = arrayMove(sortedEntities, oldIndex, newIndex).map(e => e.entity_id);
      setEntityOrder(contextId, newOrder);
    }
    
    setActiveId(null);
  };
  
  const activeEntity = sortedEntities.find((e) => e.entity_id === activeId);

  if (!area) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-12">
        <TopBar />
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <p className="text-muted-foreground">Pièce introuvable</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const customPhoto = areaPhotos[areaId];

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <TopBar />
      
      {/* Header avec photo de fond */}
      <div className="relative h-48 overflow-hidden">
        {customPhoto ? (
          <>
            <img
              src={customPhoto}
              alt={area.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-muted/30 to-background" />
        )}
        
        <div className="absolute top-0 left-0 right-0">
          <div className="max-w-screen-xl mx-auto px-6 pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/rooms")}
              className="mb-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-3xl font-bold">{area.name}</h1>
          <p className="text-muted-foreground">
            {roomEntities.length} {roomEntities.length === 1 ? "appareil" : "appareils"}
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {sortedEntities.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Aucun appareil dans cette pièce
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedEntities.map(e => e.entity_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedEntities.map((entity) => {
                  const domain = entity.entity_id.split(".")[0];
                  
                  if (domain === "media_player") {
                    return (
                      <SortableMediaPlayerCard
                        key={entity.entity_id}
                        entity={entity}
                      />
                    );
                  }
                  
                  return (
                    <SortableDeviceCard
                      key={entity.entity_id}
                      entity={entity}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeEntity ? (
                <div className="opacity-90 rotate-1 scale-105">
                  {activeEntity.entity_id.split(".")[0] === "media_player" ? (
                    <SortableMediaPlayerCard entity={activeEntity} />
                  ) : (
                    <SortableDeviceCard entity={activeEntity} onToggle={() => {}} />
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default RoomDetails;
