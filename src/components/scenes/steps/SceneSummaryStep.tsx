import { useMemo } from "react";
import { useHAStore } from "@/store/useHAStore";
import { SceneWizardDraft } from "@/types/scenes";
import { User, Users, CheckCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { isDimmableLight } from "@/lib/entityUtils";

interface SceneSummaryStepProps {
  draft: SceneWizardDraft;
}

export function SceneSummaryStep({ draft }: SceneSummaryStepProps) {
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const devices = useHAStore((s) => s.devices);
  const entityRegistry = useHAStore((s) => s.entityRegistry);

  const selectedEntities = useMemo(() => {
    return draft.selectedEntityIds
      .map((id) => entities.find((e) => e.entity_id === id))
      .filter(Boolean) as typeof entities;
  }, [draft.selectedEntityIds, entities]);

  const IconComponent = (LucideIcons as any)[draft.icon] || LucideIcons.Sparkles;

  const getAreaName = (entity: typeof entities[0]) => {
    const registry = entityRegistry[entity.entity_id];
    const device = devices.find((d) => d.id === registry?.device_id);
    const areaId = registry?.area_id || device?.area_id;
    const area = areas.find((a) => a.area_id === areaId);
    return area?.name || "Sans pièce";
  };

  const formatState = (entity: typeof entities[0]) => {
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

  // Group entities by area for summary
  const entitiesByArea = useMemo(() => {
    const grouped: Record<string, { areaName: string; entities: typeof selectedEntities }> = {};
    
    for (const entity of selectedEntities) {
      const areaName = getAreaName(entity);
      if (!grouped[areaName]) {
        grouped[areaName] = { areaName, entities: [] };
      }
      grouped[areaName].entities.push(entity);
    }
    
    return Object.values(grouped);
  }, [selectedEntities, areas, devices, entityRegistry]);

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

        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
          {entitiesByArea.map(({ areaName, entities: areaEntities }) => (
            <div key={areaName} className="space-y-1">
              <h5 className="text-xs font-medium text-muted-foreground uppercase">
                {areaName}
              </h5>
              <div className="space-y-1">
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
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tout pourra être modifié plus tard depuis les paramètres de la scène.
      </p>
    </div>
  );
}
