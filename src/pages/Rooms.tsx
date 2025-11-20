import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { Home, ArrowLeft } from "lucide-react";
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
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRoomCard } from "@/components/SortableRoomCard";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { FloorSection } from "@/components/FloorSection";
import { FloorCard } from "@/components/FloorCard";
import { ViewSelector, ViewMode } from "@/components/ViewSelector";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { HAFloor, HAArea, HAEntity } from "@/types/homeassistant";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Rooms = () => {
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const entities = useHAStore((state) => state.entities);
  const client = useHAStore((state) => state.client);
  const areaPhotos = useHAStore((state) => state.areaPhotos);
  const areaOrder = useHAStore((state) => state.areaOrder);
  const setAreaPhoto = useHAStore((state) => state.setAreaPhoto);
  const setAreaOrder = useHAStore((state) => state.setAreaOrder);
  const { displayMode } = useDisplayMode();
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Restaurer la vue depuis sessionStorage
    const savedView = sessionStorage.getItem('rooms-view-mode');
    return (savedView as ViewMode) || "floors";
  });
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const ptClass = displayMode === "mobile" ? "pt-16" : "pt-10";

  // Sauvegarder la vue dans sessionStorage
  useEffect(() => {
    sessionStorage.setItem('rooms-view-mode', viewMode);
  }, [viewMode]);

  // Réinitialiser la sélection d'étage quand on change de vue
  useEffect(() => {
    if (viewMode !== "floors") {
      setSelectedFloor(null);
    }
  }, [viewMode]);

  const entityRegistry = useHAStore((state) => state.entityRegistry);

  // Trouver les device_id des media_players pour filtrer leurs entités associées
  const mediaPlayerDeviceIds = useMemo(() => {
    return new Set(
      entities
        .filter((entity) => entity.entity_id.startsWith("media_player."))
        .map((entity) => {
          const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
          return reg?.device_id;
        })
        .filter(Boolean)
    );
  }, [entities, entityRegistry]);

  // Filtrer les entités contrôlables (pas les capteurs passifs)
  // Exclure les contrôles associés aux media_players Sonos
  const controllableEntities = useMemo(() => {
    return entities.filter(entity => {
      const domain = entity.entity_id.split(".")[0];
      
      // Vérifier si c'est une entité contrôlable
      if (!["light", "switch", "media_player", "cover", "climate", "fan"].includes(domain)) {
        return false;
      }

      // Si c'est un media_player, toujours l'inclure
      if (domain === "media_player") {
        return true;
      }

      // Vérifier si cette entité appartient au device d'un media_player
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      const deviceId = reg?.device_id;
      
      // Si cette entité appartient au même device qu'un media_player (mais n'est pas le media_player), l'exclure
      if (deviceId && mediaPlayerDeviceIds.has(deviceId)) {
        return false;
      }

      return true;
    });
  }, [entities, entityRegistry, mediaPlayerDeviceIds]);

  // Fonction pour alterner un appareil
  const handleDeviceToggle = async (entityId: string) => {
    if (!client) return;
    
    const domain = entityId.split(".")[0];
    const service = domain === "light" || domain === "switch" ? "toggle" : "toggle";
    
    try {
      await client.callService(domain, service, { entity_id: entityId });
      toast.success("Commande envoyée");
    } catch (error) {
      console.error("Error toggling device:", error);
      toast.error("Erreur lors de la commande");
    }
  };

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

  // Initialiser l'ordre si nécessaire
  useEffect(() => {
    if (areas.length > 0 && areaOrder.length === 0) {
      setAreaOrder(areas.map(area => area.area_id));
    }
  }, [areas, areaOrder.length, setAreaOrder]);

  // Organiser les pièces par étage
  const floorGroups = useMemo(() => {
    // Trier les pièces selon l'ordre personnalisé
    const sortedAreas = areaOrder.length === 0 
      ? areas 
      : [...areas].sort((a, b) => {
          const orderMap = new Map(areaOrder.map((id, index) => [id, index]));
          const orderA = orderMap.get(a.area_id) ?? Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.get(b.area_id) ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });

    // Trier les étages par niveau
    const sortedFloors = [...floors].sort((a, b) => b.level - a.level);

    // Grouper par étage
    const groups: Array<{ floor: HAFloor | null; areas: typeof areas }> = [];

    // Ajouter les étages avec leurs pièces
    sortedFloors.forEach(floor => {
      const floorAreas = sortedAreas.filter(area => area.floor_id === floor.floor_id);
      if (floorAreas.length > 0) {
        groups.push({ floor, areas: floorAreas });
      }
    });

    // Ajouter les pièces sans étage à la fin
    const noFloorAreas = sortedAreas.filter(area => !area.floor_id);
    if (noFloorAreas.length > 0) {
      groups.push({ floor: null, areas: noFloorAreas });
    }

    return groups;
  }, [areas, floors, areaOrder]);

  // Compter les appareils par pièce
  const getDeviceCount = (areaId: string) => {
    return devices.filter((device) => device.area_id === areaId && !device.disabled_by).length;
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Limiter la taille max à 800px pour économiser l'espace
          const maxSize = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compression JPEG à 0.7 pour réduire la taille
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          console.log('📸 Original size:', (e.target?.result as string)?.length, 'Compressed:', compressedDataUrl.length);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (areaId: string, file: File) => {
    try {
      console.log('📸 Photo change for areaId:', areaId);
      const compressedDataUrl = await compressImage(file);
      console.log('📸 Compressed DataURL for areaId:', areaId, 'Length:', compressedDataUrl.length);
      setAreaPhoto(areaId, compressedDataUrl);
      
      // Vérifier la taille totale du localStorage
      setTimeout(() => {
        const stored = localStorage.getItem('ha-storage');
        if (stored) {
          console.log('📸 LocalStorage total size:', (stored.length / 1024).toFixed(2), 'KB');
          const parsed = JSON.parse(stored);
          console.log('📸 AreaPhotos keys:', Object.keys(parsed.state?.areaPhotos || {}));
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error compressing image:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Trouver tous les area_ids dans l'ordre actuel
      const allAreaIds = floorGroups.flatMap(group => group.areas.map(a => a.area_id));
      const oldIndex = allAreaIds.indexOf(active.id as string);
      const newIndex = allAreaIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(allAreaIds, oldIndex, newIndex);
        setAreaOrder(newOrder);
      }
    }
  };
  
  const activeArea = areas.find((area) => area.area_id === activeId);
  
  // Tous les area_ids pour le drag and drop - utilise l'ordre personnalisé
  const allAreaIds = useMemo(() => {
    if (areaOrder.length === 0) return areas.map(a => a.area_id);
    return areaOrder.filter(id => areas.some(a => a.area_id === id));
  }, [areaOrder, areas]);

  // Pièces triées selon l'ordre personnalisé pour la vue "Pièces"
  const sortedAreas = useMemo(() => {
    if (areaOrder.length === 0) return areas;
    const orderMap = new Map(areaOrder.map((id, index) => [id, index]));
    return [...areas].sort((a, b) => {
      const orderA = orderMap.get(a.area_id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.area_id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [areas, areaOrder]);

  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Maison" />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        
        <div className="mb-6">
          <ViewSelector 
            selectedView={viewMode} 
            onViewChange={setViewMode} 
          />
        </div>
        
        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune pièce configurée</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configurez des pièces dans Home Assistant
            </p>
          </div>
        ) : (
          <>
            {/* Vue Étages avec drill-down */}
            {viewMode === "floors" && !selectedFloor && (
              <div className="space-y-3 animate-fade-in">
                {floorGroups.map((group) => {
                  const floorId = group.floor?.floor_id || "no-floor";
                  const roomCount = group.areas.length;
                  const deviceCount = group.areas.reduce((acc, area) => 
                    acc + getDeviceCount(area.area_id), 0
                  );
                  
                  return (
                    <FloorCard
                      key={floorId}
                      floor={group.floor}
                      roomCount={roomCount}
                      deviceCount={deviceCount}
                      onClick={() => setSelectedFloor(floorId)}
                    />
                  );
                })}
              </div>
            )}

            {/* Vue des pièces d'un étage sélectionné */}
            {viewMode === "floors" && selectedFloor && (
              <div className="space-y-4 animate-fade-in">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFloor(null)}
                  className="mb-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour aux étages
                </Button>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={floorGroups.find(g => (g.floor?.floor_id || "no-floor") === selectedFloor)?.areas.map(a => a.area_id) || []}
                    strategy={rectSortingStrategy}
                  >
                    {floorGroups
                      .filter(g => (g.floor?.floor_id || "no-floor") === selectedFloor)
                      .map((group) => (
                        <FloorSection
                          key={group.floor?.floor_id || 'no-floor'}
                          floor={group.floor}
                          areas={group.areas}
                          devices={devices}
                          areaPhotos={areaPhotos}
                          onPhotoChange={handlePhotoChange}
                          displayMode={displayMode}
                          isCollapsible={false}
                        />
                      ))}
                  </SortableContext>
                  
                  <DragOverlay dropAnimation={null}>
                    {activeArea ? (
                      <div className="opacity-90 rotate-3 scale-105">
                        <SortableRoomCard
                          areaId={activeArea.area_id}
                          name={activeArea.name}
                          deviceCount={getDeviceCount(activeArea.area_id)}
                          customPhoto={areaPhotos[activeArea.area_id]}
                          onPhotoChange={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )}

            {/* Vue Pièces - toutes les pièces à plat avec ordre personnalisable */}
            {viewMode === "rooms" && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={allAreaIds}
                  strategy={rectSortingStrategy}
                >
                  <div className={`grid ${displayMode === "mobile" ? "grid-cols-1" : displayMode === "tablet" ? "grid-cols-2" : "grid-cols-3"} gap-4 animate-fade-in`}>
                    {sortedAreas.map((area) => (
                      <SortableRoomCard
                        key={area.area_id}
                        areaId={area.area_id}
                        name={area.name}
                        deviceCount={getDeviceCount(area.area_id)}
                        customPhoto={areaPhotos[area.area_id]}
                        onPhotoChange={(file) => handlePhotoChange(area.area_id, file)}
                      />
                    ))}
                  </div>
                </SortableContext>
                
                <DragOverlay dropAnimation={null}>
                  {activeArea ? (
                    <div className="opacity-90 rotate-3 scale-105">
                      <SortableRoomCard
                        areaId={activeArea.area_id}
                        name={activeArea.name}
                        deviceCount={getDeviceCount(activeArea.area_id)}
                        customPhoto={areaPhotos[activeArea.area_id]}
                        onPhotoChange={() => {}}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Vue Appareils - tous les appareils à plat */}
            {viewMode === "devices" && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={controllableEntities.map(e => e.entity_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 animate-fade-in">
                    {controllableEntities.map((entity) => {
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
                  {activeId && entities.find(e => e.entity_id === activeId) ? (
                    <div className="opacity-90 rotate-1 scale-105">
                      {activeId.startsWith("media_player.") ? (
                        <SortableMediaPlayerCard entity={entities.find(e => e.entity_id === activeId)!} />
                      ) : (
                        <SortableDeviceCard entity={entities.find(e => e.entity_id === activeId)!} onToggle={() => {}} />
                      )}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
