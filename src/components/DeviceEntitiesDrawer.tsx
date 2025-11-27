import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import type { HAEntity, HADevice } from "@/types/homeassistant";

interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  entity_category?: string;
  disabled_by?: string | null;
  hidden_by?: string | null;
}

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
  // Find the device for this entity
  const deviceInfo = useMemo(() => {
    const reg = entityRegistry.find((r) => r.entity_id === primaryEntity.entity_id);
    if (!reg?.device_id) return null;
    
    const device = devices.find((d) => d.id === reg.device_id);
    return device || null;
  }, [primaryEntity, entityRegistry, devices]);

  // Find all entities belonging to this device
  const deviceEntities = useMemo(() => {
    if (!deviceInfo) {
      // If no device, just return the primary entity
      return [primaryEntity];
    }

    return entities.filter((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      return reg?.device_id === deviceInfo.id;
    });
  }, [deviceInfo, entities, entityRegistry, primaryEntity]);

  const deviceName = deviceInfo?.name_by_user || deviceInfo?.name || primaryEntity.attributes.friendly_name || primaryEntity.entity_id;

  const formatEntityValue = (entity: HAEntity): string => {
    const { state, attributes } = entity;
    const unit = attributes.unit_of_measurement;
    
    if (state === "unavailable") return "Indisponible";
    if (state === "unknown") return "Inconnu";
    
    if (unit) {
      return `${state} ${unit}`;
    }
    
    // Translate common states
    const stateMap: Record<string, string> = {
      on: "Allumé",
      off: "Éteint",
      open: "Ouvert",
      closed: "Fermé",
      locked: "Verrouillé",
      unlocked: "Déverrouillé",
      home: "Présent",
      not_home: "Absent",
      playing: "Lecture",
      paused: "Pause",
      idle: "Inactif",
    };
    
    return stateMap[state] || state;
  };

  const getEntityCategory = (entityId: string): string | null => {
    const reg = entityRegistry.find((r) => r.entity_id === entityId);
    return reg?.entity_category || null;
  };

  const getDomainIcon = (entityId: string): string => {
    const domain = entityId.split(".")[0];
    const iconMap: Record<string, string> = {
      light: "💡",
      switch: "🔌",
      sensor: "📊",
      binary_sensor: "🔘",
      cover: "🪟",
      climate: "🌡️",
      fan: "🌀",
      lock: "🔒",
      camera: "📷",
      media_player: "🎵",
      scene: "🎬",
      script: "📜",
      button: "🔘",
      number: "🔢",
      select: "📋",
      update: "⬆️",
    };
    return iconMap[domain] || "📦";
  };

  // Group entities by category
  const groupedEntities = useMemo(() => {
    const control: HAEntity[] = [];
    const diagnostic: HAEntity[] = [];
    const config: HAEntity[] = [];
    const other: HAEntity[] = [];

    deviceEntities.forEach((entity) => {
      const category = getEntityCategory(entity.entity_id);
      if (category === "diagnostic") {
        diagnostic.push(entity);
      } else if (category === "config") {
        config.push(entity);
      } else {
        const domain = entity.entity_id.split(".")[0];
        if (["light", "switch", "cover", "climate", "fan", "lock", "scene", "script"].includes(domain)) {
          control.push(entity);
        } else {
          other.push(entity);
        }
      }
    });

    return { control, diagnostic, config, other };
  }, [deviceEntities]);

  const renderEntityRow = (entity: HAEntity) => {
    const name = entity.attributes.friendly_name || entity.entity_id;
    const value = formatEntityValue(entity);
    const icon = getDomainIcon(entity.entity_id);

    return (
      <div
        key={entity.entity_id}
        className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-lg shrink-0">{icon}</span>
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
        <span className="text-sm text-muted-foreground shrink-0 ml-2">{value}</span>
      </div>
    );
  };

  const renderSection = (title: string, entities: HAEntity[]) => {
    if (entities.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
          {title}
        </h4>
        <div className="space-y-1.5">
          {entities.map(renderEntityRow)}
        </div>
      </div>
    );
  };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">{deviceName}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          {deviceInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              {deviceInfo.manufacturer} {deviceInfo.model}
            </p>
          )}
        </DrawerHeader>
        
        <div className="overflow-y-auto p-4 space-y-6">
          {renderSection("Contrôles", groupedEntities.control)}
          {renderSection("Capteurs", groupedEntities.other)}
          {renderSection("Diagnostic", groupedEntities.diagnostic)}
          {renderSection("Configuration", groupedEntities.config)}
          
          {deviceEntities.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Aucune entité trouvée pour cet appareil.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
