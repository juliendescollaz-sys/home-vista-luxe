import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useHAStore } from "@/store/useHAStore";
import { SceneWizardDraft } from "@/types/scenes";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { SceneDeviceItem } from "@/components/scenes/SceneDeviceItem";
import { 
  NeoliaRoom, 
  NeoliaFloor, 
  EntityRegistryEntry as SceneEntityRegistryEntry,
  DeviceRegistryEntry,
  isSceneEligibleEntity,
} from "@/utils/sceneDevices";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface SceneDeviceSelectionStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

export function SceneDeviceSelectionStep({ draft, onUpdate }: SceneDeviceSelectionStepProps) {
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const devices = useHAStore((s) => s.devices);
  const entityRegistry = useHAStore((s) => s.entityRegistry);

  const [search, setSearch] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  // Filtrer les entités éligibles pour une scène (même logique que le reste de l'app)
  const eligibleEntities = useMemo(() => {
    return entities.filter((entity) => {
      const friendlyName = entity.attributes.friendly_name || entity.entity_id;
      return isSceneEligibleEntity(entity.entity_id, friendlyName);
    });
  }, [entities]);

  // Helper pour obtenir l'area_id d'une entité (via registry ou device)
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry[entityId];
    if (reg?.area_id) return reg.area_id;
    
    if (reg?.device_id) {
      const device = devices.find(d => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    
    return undefined;
  };

  // Grouper les entités par étage > pièce
  const groupedEntities = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    const filteredEntities = eligibleEntities.filter((e) => {
      if (!search.trim()) return true;
      const name = e.attributes.friendly_name || e.entity_id;
      return name.toLowerCase().includes(searchLower);
    });

    // Grouper par area
    const byArea: Record<string, HAEntity[]> = {};
    const noArea: HAEntity[] = [];

    for (const entity of filteredEntities) {
      const areaId = getEntityAreaId(entity.entity_id);
      
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    // Grouper les areas par floor
    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entities: HAEntity[] }[] }> = {};
    const noFloorAreas: { area: HAArea; entities: HAEntity[] }[] = [];

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
      const area = areas.find((a) => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find((f) => f.floor_id === area.floor_id);
      const floorKey = floor?.floor_id || "__no_floor__";

      if (floor) {
        if (!byFloor[floorKey]) {
          byFloor[floorKey] = { floor, areas: [] };
        }
        byFloor[floorKey].areas.push({ area, entities: areaEntities });
      } else {
        noFloorAreas.push({ area, entities: areaEntities });
      }
    }

    return { byFloor, noFloorAreas, noArea };
  }, [eligibleEntities, areas, floors, devices, search, entityRegistry]);

  const toggleEntity = (entityId: string) => {
    const newSelected = draft.selectedEntityIds.includes(entityId)
      ? draft.selectedEntityIds.filter((id) => id !== entityId)
      : [...draft.selectedEntityIds, entityId];
    onUpdate({ selectedEntityIds: newSelected });
  };

  const toggleArea = (areaEntities: HAEntity[]) => {
    const entityIds = areaEntities.map((e) => e.entity_id);
    const allSelected = entityIds.every((id) => draft.selectedEntityIds.includes(id));
    
    if (allSelected) {
      onUpdate({
        selectedEntityIds: draft.selectedEntityIds.filter((id) => !entityIds.includes(id)),
      });
    } else {
      const newSelected = new Set([...draft.selectedEntityIds, ...entityIds]);
      onUpdate({ selectedEntityIds: Array.from(newSelected) });
    }
  };

  const toggleAreaExpanded = (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  // Préparer les données pour SceneDeviceItem
  const sceneEntityRegistry: Record<string, SceneEntityRegistryEntry> = useMemo(() => {
    const result: Record<string, SceneEntityRegistryEntry> = {};
    for (const [entityId, reg] of Object.entries(entityRegistry)) {
      if (reg) {
        result[entityId] = {
          entity_id: entityId,
          device_id: reg.device_id,
          area_id: reg.area_id,
        };
      }
    }
    return result;
  }, [entityRegistry]);

  const sceneDevices: DeviceRegistryEntry[] = useMemo(() => {
    return devices.map(d => ({
      id: d.id,
      area_id: d.area_id,
    }));
  }, [devices]);

  const sceneAreas: NeoliaRoom[] = useMemo(() => {
    return areas.map(a => ({
      area_id: a.area_id,
      name: a.name,
      floor_id: a.floor_id,
    }));
  }, [areas]);

  const sceneFloors: NeoliaFloor[] = useMemo(() => {
    return floors.map(f => ({
      floor_id: f.floor_id,
      name: f.name,
    }));
  }, [floors]);

  const renderEntityItem = (entity: HAEntity, hideLocation = false) => {
    const isSelected = draft.selectedEntityIds.includes(entity.entity_id);
    const friendlyName = entity.attributes.friendly_name || entity.entity_id;

    return (
      <SceneDeviceItem
        key={entity.entity_id}
        entityId={entity.entity_id}
        friendlyName={friendlyName}
        isSelected={isSelected}
        onSelect={() => toggleEntity(entity.entity_id)}
        entityRegistry={sceneEntityRegistry}
        devices={sceneDevices}
        areas={sceneAreas}
        floors={sceneFloors}
        hideLocation={hideLocation}
      />
    );
  };

  const renderAreaSection = (area: HAArea, areaEntities: HAEntity[]) => {
    const isExpanded = expandedAreas.has(area.area_id);
    const selectedCount = areaEntities.filter((e) => draft.selectedEntityIds.includes(e.entity_id)).length;
    const allSelected = selectedCount === areaEntities.length && areaEntities.length > 0;

    return (
      <Collapsible key={area.area_id} open={isExpanded} onOpenChange={() => toggleAreaExpanded(area.area_id)}>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => toggleArea(areaEntities)}
          />
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-medium text-sm">{area.name}</span>
            <span className="text-xs text-muted-foreground">
              ({selectedCount}/{areaEntities.length})
            </span>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pl-6 space-y-1">
          {areaEntities.map((entity) => renderEntityItem(entity, true))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un appareil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Sélectionnés : <strong>{draft.selectedEntityIds.length}</strong> appareil(s)
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
        {/* Par étage */}
        {Object.entries(groupedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
          <div key={floorId} className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {floor?.name || "Étage"}
            </h4>
            <div className="space-y-1 border-l-2 border-muted pl-3">
              {floorAreas.map(({ area, entities: areaEntities }) => renderAreaSection(area, areaEntities))}
            </div>
          </div>
        ))}

        {/* Pièces sans étage */}
        {groupedEntities.noFloorAreas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Autres pièces
            </h4>
            <div className="space-y-1 border-l-2 border-muted pl-3">
              {groupedEntities.noFloorAreas.map(({ area, entities: areaEntities }) => 
                renderAreaSection(area, areaEntities)
              )}
            </div>
          </div>
        )}

        {/* Entités sans pièce */}
        {groupedEntities.noArea.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sans pièce assignée
            </h4>
            <div className="space-y-1 pl-3">
              {groupedEntities.noArea.map((entity) => renderEntityItem(entity, false))}
            </div>
          </div>
        )}

        {/* Message si aucun résultat */}
        {Object.keys(groupedEntities.byFloor).length === 0 && 
         groupedEntities.noFloorAreas.length === 0 && 
         groupedEntities.noArea.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun appareil trouvé
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Choisissez tous les appareils dont l'état sera défini par cette scène. 
          Vous pourrez régler l'état précis de chaque appareil à l'étape suivante 
          (intensité, couleur, position, volume…).
        </p>
      </div>
    </div>
  );
}
