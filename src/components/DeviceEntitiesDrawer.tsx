import { useMemo } from "react";
import { X } from "lucide-react";
import type { HAEntity, HADevice } from "@/types/homeassistant";
import type { EntityRegistryEntry } from "@/lib/entityUtils";

interface DeviceEntitiesDrawerProps {
  primaryEntity: HAEntity;
  entities: HAEntity[];
  entityRegistry: EntityRegistryEntry[];
  devices: HADevice[];
  onClose: () => void;
}

export function DeviceEntitiesDrawer({
  primaryEntity,
  entities,
  entityRegistry,
  devices,
  onClose,
}: DeviceEntitiesDrawerProps) {
  // 1. Trouver device_id
  const reg = entityRegistry.find((r) => r.entity_id === primaryEntity.entity_id);
  const deviceId = reg?.device_id;

  // 2. Récupérer toutes les entités de ce device
  const relatedEntities = useMemo(() => {
    if (!deviceId) {
      // Pas de device_id → on affiche au moins l'entité principale
      return [primaryEntity];
    }

    const idsForDevice = entityRegistry
      .filter((r) => r.device_id === deviceId)
      .map((r) => r.entity_id);

    return entities.filter((e) => idsForDevice.includes(e.entity_id));
  }, [deviceId, entityRegistry, entities, primaryEntity]);

  // 3. Trouver le device pour le titre
  const device = deviceId ? devices.find((d) => d.id === deviceId) : undefined;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full md:max-w-xl bg-background rounded-t-2xl md:rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">
              {device?.name || primaryEntity.attributes.friendly_name || primaryEntity.entity_id}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              {primaryEntity.entity_id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Liste des entités du device */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {relatedEntities.map((e) => {
            const domain = e.entity_id.split(".")[0];
            const name = e.attributes.friendly_name || e.entity_id;
            const state = e.state;
            const unit = e.attributes.unit_of_measurement;
            const entityReg = entityRegistry.find((r) => r.entity_id === e.entity_id);
            const category = entityReg?.entity_category;

            return (
              <div
                key={e.entity_id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50 text-sm"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{name}</span>
                    {category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                        {category}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">{e.entity_id}</span>
                </div>
                <div className="flex items-center gap-2 text-right ml-2 flex-shrink-0">
                  <span className="text-sm font-medium">
                    {state}
                    {unit ? ` ${unit}` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-border/60 text-xs text-muted-foreground text-center">
          {relatedEntities.length} entité{relatedEntities.length > 1 ? "s" : ""} pour ce device
        </div>
      </div>
    </div>
  );
}
