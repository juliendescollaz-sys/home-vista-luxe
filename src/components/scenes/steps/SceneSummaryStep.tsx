import { useMemo } from "react";
import { useHAStore } from "@/store/useHAStore";
import { SceneWizardDraft } from "@/types/scenes";
import { User, Users, CheckCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { isDimmableLight } from "@/lib/entityUtils";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface SceneSummaryStepProps {
  draft: SceneWizardDraft;
}

export function SceneSummaryStep({ draft }: SceneSummaryStepProps) {
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const devices = useHAStore((s) => s.devices);
  const entityRegistry = useHAStore((s) => s.entityRegistry);

  const selectedEntities = useMemo(() => {
    return draft.selectedEntityIds
      .map((id) => entities.find((e) => e.entity_id === id))
      .filter(Boolean) as HAEntity[];
  }, [draft.selectedEntityIds, entities]);

  const IconComponent = (LucideIcons as any)[draft.icon] || LucideIcons.Sparkles;

  // Helper to get area_id for an entity (same logic as Step 2)
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find(r => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find(d => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  // Format room label: "Floor – Room" or just "Room"
  const getRoomLabel = (entity: HAEntity): string | undefined => {
    const areaId = getEntityAreaId(entity.entity_id);
    if (!areaId) return undefined;
    
    const area = areas.find(a => a.area_id === areaId);
    if (!area) return undefined;
    
    const floor = area.floor_id ? floors.find(f => f.floor_id === area.floor_id) : undefined;
    
    if (floor) {
      return `${floor.name} – ${area.name}`;
    }
    return area.name;
  };

  const formatState = (entity: HAEntity) => {
    const domain = entity.entity_id.split(".")[0];
    const state = draft.entityStates[entity.entity_id];
    if (!state) return "Non configuré";

    const parts: string[] = [];

    if (state.state === "on") parts.push("Allumé");
    else if (state.state === "off") parts.push("Éteint");
    else if (state.state === "open") parts.push("Ouvert");
    else if (state.state === "closed") parts.push("Fermé");
    else if (state.state === "playing") parts.push("Lecture");
    else if (state.state === "paused") parts.push("Pause");

    // Only show brightness % for dimmable lights
    if (domain === "light" && state.brightness !== undefined && isDimmableLight(entity)) {
      parts.push(`${Math.round((state.brightness / 255) * 100)}%`);
    }
    if (domain === "cover" && state.position !== undefined) {
      parts.push(`${state.position}%`);
    }
    if (domain === "climate") {
      if (state.hvac_mode) parts.push(state.hvac_mode);
      if (state.temperature !== undefined) parts.push(`${state.temperature}°C`);
    }
    if (domain === "media_player" && state.volume_level !== undefined) {
      parts.push(`Vol. ${Math.round(state.volume_level * 100)}%`);
    }

    return parts.join(", ") || "Configuré";
  };

  // Group entities by floor > area (same structure as Step 2)
  const groupedEntities = useMemo(() => {
    // Group by area
    const byArea: Record<string, HAEntity[]> = {};
    const noArea: HAEntity[] = [];

    for (const entity of selectedEntities) {
      const areaId = getEntityAreaId(entity.entity_id);
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    // Group areas by floor
    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entities: HAEntity[] }[] }> = {};
    const noFloorAreas: { area: HAArea; entities: HAEntity[] }[] = [];

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
      const area = areas.find(a => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find(f => f.floor_id === area.floor_id);
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
  }, [selectedEntities, areas, floors, devices, entityRegistry]);

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Vérifiez les paramètres de votre scène avant de la sauvegarder. 
          Une fois créée, la scène sera disponible dans la page Scènes et pourra être 
          ajoutée aux Favoris ou aux widgets.
        </p>
      </div>

      {/* Scene info card */}
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{draft.name || "Sans nom"}</h3>
            {draft.description && (
              <p className="text-sm text-muted-foreground">{draft.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {draft.scope === "local" ? (
            <>
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Local uniquement</span>
            </>
          ) : (
            <>
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Partagée</span>
            </>
          )}
        </div>
      </div>

      {/* Entities summary */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          {selectedEntities.length} appareil{selectedEntities.length > 1 ? "s" : ""} configuré{selectedEntities.length > 1 ? "s" : ""}
        </h4>

        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
          {/* By floor */}
          {Object.entries(groupedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
            <div key={floorId} className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {floor?.name || "Étage"}
              </h5>
              {floorAreas.map(({ area, entities: areaEntities }) => (
                <div key={area.area_id} className="space-y-1">
                  <h6 className="text-xs font-medium text-muted-foreground ml-2">
                    {area.name}
                  </h6>
                  <div className="space-y-1 ml-2">
                    {areaEntities.map((entity) => (
                      <div
                        key={entity.entity_id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-sm"
                      >
                        <span className="truncate">
                          {entity.attributes.friendly_name || entity.entity_id}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {formatState(entity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Areas without floor */}
          {groupedEntities.noFloorAreas.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Autres pièces
              </h5>
              {groupedEntities.noFloorAreas.map(({ area, entities: areaEntities }) => (
                <div key={area.area_id} className="space-y-1">
                  <h6 className="text-xs font-medium text-muted-foreground ml-2">
                    {area.name}
                  </h6>
                  <div className="space-y-1 ml-2">
                    {areaEntities.map((entity) => (
                      <div
                        key={entity.entity_id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-sm"
                      >
                        <span className="truncate">
                          {entity.attributes.friendly_name || entity.entity_id}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {formatState(entity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Entities without area */}
          {groupedEntities.noArea.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sans pièce
              </h5>
              <div className="space-y-1">
                {groupedEntities.noArea.map((entity) => (
                  <div
                    key={entity.entity_id}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-sm"
                  >
                    <span className="truncate">
                      {entity.attributes.friendly_name || entity.entity_id}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {formatState(entity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tout pourra être modifié plus tard depuis les paramètres de la scène.
      </p>
    </div>
  );
}
