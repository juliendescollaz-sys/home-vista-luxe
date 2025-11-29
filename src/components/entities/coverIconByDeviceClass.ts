import { 
  Blinds, 
  Tent, 
  AppWindow, 
  DoorClosed, 
  Warehouse, 
  DoorOpen,
  type LucideIcon 
} from "lucide-react";

/**
 * Retourne l'icône Lucide appropriée selon la device_class du cover
 * Basé sur les valeurs de "Afficher en tant que" dans Home Assistant
 */
export function getCoverIconByDeviceClass(deviceClass?: string | null): LucideIcon {
  switch (deviceClass) {
    case "awning":        // Auvent
      return Tent;
    case "shade":         // Store banne / store screen
    case "blind":         // Store
      return Blinds;
    case "curtain":       // Rideau
      return Blinds;
    case "window":        // Fenêtre
      return AppWindow;
    case "door":          // Porte
      return DoorClosed;
    case "garage":        // Porte de garage
      return Warehouse;
    case "gate":          // Portail
      return DoorOpen;
    case "shutter":       // Volet
      return Blinds;
    case "damper":        // Clapet
      return Blinds;
    default:              // Type générique "cover"
      return Blinds;
  }
}

/**
 * Retourne le label français pour la device_class du cover
 */
export function getCoverDeviceClassLabel(deviceClass?: string | null): string {
  switch (deviceClass) {
    case "awning":
      return "Auvent";
    case "shade":
      return "Store banne";
    case "blind":
      return "Store";
    case "curtain":
      return "Rideau";
    case "window":
      return "Fenêtre";
    case "door":
      return "Porte";
    case "garage":
      return "Garage";
    case "gate":
      return "Portail";
    case "shutter":
      return "Volet";
    case "damper":
      return "Clapet";
    default:
      return "Volet";
  }
}
