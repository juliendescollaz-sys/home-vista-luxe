import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { Home } from "lucide-react";
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
} from "@dnd-kit/sortable";
import { SortableRoomCard } from "@/components/SortableRoomCard";
import { FloorSection } from "@/components/FloorSection";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { HAFloor } from "@/types/homeassistant";

const Rooms = () => {
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const areaPhotos = useHAStore((state) => state.areaPhotos);
  const areaOrder = useHAStore((state) => state.areaOrder);
  const setAreaPhoto = useHAStore((state) => state.setAreaPhoto);
  const setAreaOrder = useHAStore((state) => state.setAreaOrder);
  const { displayMode } = useDisplayMode();
  
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
  
  // Tous les area_ids pour le drag and drop
  const allAreaIds = useMemo(() => 
    floorGroups.flatMap(group => group.areas.map(a => a.area_id)),
    [floorGroups]
  );

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Maison</h2>
        
        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune pièce configurée</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configurez des pièces dans Home Assistant
            </p>
          </div>
        ) : (
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
              <div className="space-y-8">
                {floorGroups.map((group) => (
                  <FloorSection
                    key={group.floor?.floor_id || 'no-floor'}
                    floor={group.floor}
                    areas={group.areas}
                    devices={devices}
                    areaPhotos={areaPhotos}
                    onPhotoChange={handlePhotoChange}
                    displayMode={displayMode}
                    isCollapsible={displayMode === "mobile"}
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
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
