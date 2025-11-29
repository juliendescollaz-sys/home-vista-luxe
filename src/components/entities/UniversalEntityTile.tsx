import { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { getEntityDomain, getBestWidgetForEntity } from "@/lib/entityUtils";
import { LightTile } from "./LightTile";
import { CoverEntityTile } from "./CoverEntityTile";
import { ClimateTile } from "./ClimateTile";
import { FanTile } from "./FanTile";
import { LockTile } from "./LockTile";
import { ValveTile } from "./ValveTile";
import { SensorTile } from "./SensorTile";
import { AlertTile } from "./AlertTile";
import { UpdateTile } from "./UpdateTile";
import { SortableDeviceCard } from "../SortableDeviceCard";
import { SortableMediaPlayerCard } from "../SortableMediaPlayerCard";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";

interface UniversalEntityTileProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
}

/**
 * Composant universel qui détecte automatiquement le meilleur widget
 * à utiliser pour une entité donnée
 */
export function UniversalEntityTile({ entity, floor, area }: UniversalEntityTileProps) {
  const client = useHAStore((state) => state.client);
  const domain = getEntityDomain(entity.entity_id);
  const widgetType = getBestWidgetForEntity(entity);
  const { toggleEntity, controlEntity } = useOptimisticToggle();
  
  const handleControl = async (service: string, data?: any) => {
    // Déterminer l'état cible pour l'UI optimiste (sauf media_player)
    let targetState: string | undefined;
    
    if (domain !== "media_player") {
      if (service === "turn_on" || service === "open" || service === "unlock") {
        targetState = "on";
      } else if (service === "turn_off" || service === "close" || service === "lock") {
        targetState = "off";
      }
    }
    
    try {
      await controlEntity(entity.entity_id, service, data, targetState);
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      throw error;
    }
  };
  
  const handleToggle = async (entityId: string) => {
    await toggleEntity(entityId);
  };
  
  const handleUpdate = async () => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }
    
    try {
      await client.callService("update", "install", {}, { entity_id: entity.entity_id });
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      throw error;
    }
  };
  
  // Routing vers le bon composant
  switch (widgetType) {
    case "update":
      return <UpdateTile entity={entity} onUpdate={handleUpdate} />;
      
    case "alert":
      return <AlertTile entity={entity} />;
      
    case "sensor":
      return <SensorTile entity={entity} />;
      
    case "tile":
      // Composants spécialisés selon le domaine
      switch (domain) {
        case "light":
          return <LightTile entity={entity} onControl={handleControl} />;
          
        case "cover":
          return <CoverEntityTile entity={entity} onControl={handleControl} />;
          
        case "climate":
          return <ClimateTile entity={entity} onControl={handleControl} />;
          
        case "fan":
          return <FanTile entity={entity} onControl={handleControl} />;
          
        case "lock":
          return <LockTile entity={entity} onControl={handleControl} />;
          
        case "water_heater":
          return <ValveTile entity={entity} onControl={handleControl} />;
          
        case "media_player":
          return <SortableMediaPlayerCard entity={entity} floor={floor} area={area} />;
          
        default:
          // Fallback vers le DeviceCard existant pour les autres domaines
          return <SortableDeviceCard entity={entity} onToggle={handleToggle} floor={floor} area={area} />;
      }
      
    default:
      // Fallback pour tous les autres cas
      return <SortableDeviceCard entity={entity} onToggle={handleToggle} floor={floor} area={area} />;
  }
}
