import { HAEntity } from "@/types/homeassistant";
import { getEntityDomain, getBestWidgetForEntity } from "@/lib/entityUtils";
import { LightTile } from "./LightTile";
import { CoverTile } from "./CoverTile";
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

interface UniversalEntityTileProps {
  entity: HAEntity;
}

/**
 * Composant universel qui détecte automatiquement le meilleur widget
 * à utiliser pour une entité donnée
 */
export function UniversalEntityTile({ entity }: UniversalEntityTileProps) {
  const client = useHAStore((state) => state.client);
  const domain = getEntityDomain(entity.entity_id);
  const widgetType = getBestWidgetForEntity(entity);
  
  const handleControl = async (service: string, data?: any) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }
    
    try {
      await client.callService(domain, service, data, { entity_id: entity.entity_id });
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      throw error;
    }
  };
  
  const handleToggle = async (entityId: string) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }
    
    const isOn = entity.state === "on";
    const service = isOn ? "turn_off" : "turn_on";
    
    try {
      await client.callService(domain, service, {}, { entity_id: entityId });
      toast.success(isOn ? "Éteint" : "Allumé");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle");
    }
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
          return <CoverTile entity={entity} onControl={handleControl} />;
          
        case "climate":
          return <ClimateTile entity={entity} onControl={handleControl} />;
          
        case "fan":
          return <FanTile entity={entity} onControl={handleControl} />;
          
        case "lock":
          return <LockTile entity={entity} onControl={handleControl} />;
          
        case "water_heater":
          return <ValveTile entity={entity} onControl={handleControl} />;
          
        case "media_player":
          return <SortableMediaPlayerCard entity={entity} />;
          
        default:
          // Fallback vers le DeviceCard existant pour les autres domaines
          return <SortableDeviceCard entity={entity} onToggle={handleToggle} />;
      }
      
    default:
      // Fallback pour tous les autres cas
      return <SortableDeviceCard entity={entity} onToggle={handleToggle} />;
  }
}
