import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
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

const Home = () => {
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const entityOrder = useHAStore((state) => state.entityOrder);
  const setEntityOrder = useHAStore((state) => state.setEntityOrder);

  const contextId = "home-active";
  
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

  // Trouver les device_id des media_players pour filtrer leurs entités associées
  const mediaPlayerDeviceIds = new Set(
    entities
      ?.filter((entity) => entity.entity_id.startsWith("media_player."))
      .map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        return reg?.device_id;
      })
      .filter(Boolean) || []
  );

  // Appareils actifs uniquement (lumières, switches actifs + media_player en lecture)
  // Exclure les entités associées aux media_players (volume, loudness, etc.)
  const activeDevices = entities?.filter(e => {
    // Vérifier si cette entité appartient au device d'un media_player
    const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
    const deviceId = reg?.device_id;
    
    // Si c'est une entité associée à un media_player (mais pas le media_player lui-même), l'exclure
    if (deviceId && mediaPlayerDeviceIds.has(deviceId) && !e.entity_id.startsWith("media_player.")) {
      return false;
    }

    if (e.entity_id.startsWith("light.") || e.entity_id.startsWith("switch.")) {
      return e.state === "on";
    }
    if (e.entity_id.startsWith("media_player.")) {
      return e.state === "playing";
    }
    return false;
  }) || [];

  // Initialiser l'ordre si nécessaire
  useEffect(() => {
    if (activeDevices.length > 0 && (!entityOrder[contextId] || entityOrder[contextId].length === 0)) {
      setEntityOrder(contextId, activeDevices.map(e => e.entity_id));
    }
  }, [activeDevices.length, entityOrder, contextId, setEntityOrder]);

  // Trier les appareils actifs selon l'ordre personnalisé
  const sortedDevices = useMemo(() => {
    if (!entityOrder[contextId] || entityOrder[contextId].length === 0) return activeDevices;
    
    const orderMap = new Map(entityOrder[contextId].map((id, index) => [id, index]));
    return [...activeDevices].sort((a, b) => {
      const orderA = orderMap.get(a.entity_id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.entity_id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [activeDevices, entityOrder, contextId]);

  const handleDeviceToggle = async (entityId: string) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    const entity = entities?.find((e) => e.entity_id === entityId);
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
      const oldIndex = sortedDevices.findIndex((e) => e.entity_id === active.id);
      const newIndex = sortedDevices.findIndex((e) => e.entity_id === over.id);

      const newOrder = arrayMove(sortedDevices, oldIndex, newIndex).map(e => e.entity_id);
      setEntityOrder(contextId, newOrder);
    }
    
    setActiveId(null);
  };
  
  const activeEntity = sortedDevices.find((e) => e.entity_id === activeId);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-20">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Section météo */}
        <div className="animate-fade-in">
          <AnimatedWeatherTile />
        </div>

        {/* Appareils actifs */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold">Appareils actifs</h2>
          
          {sortedDevices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun appareil actif
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedDevices.map(e => e.entity_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedDevices.map((entity) => {
                    const isMediaPlayer = entity.entity_id.startsWith("media_player.");
                    return isMediaPlayer ? (
                      <SortableMediaPlayerCard
                        key={entity.entity_id}
                        entity={entity}
                      />
                    ) : (
                      <SortableDeviceCard
                        key={entity.entity_id}
                        entity={entity}
                        onToggle={handleDeviceToggle}
                      />
                    );
                  })}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeEntity ? (
                  <div className="opacity-90 rotate-1 scale-105">
                    {activeEntity.entity_id.startsWith("media_player.") ? (
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

      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
