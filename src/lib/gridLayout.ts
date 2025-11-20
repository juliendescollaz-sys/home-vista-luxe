/**
 * Configuration de grille homogène pour toutes les pages
 * Optimisé pour Tablet et Panel avec exploitation maximale de l'espace
 */

export type ContentType = 
  | "devices"      // Appareils, Media Players
  | "rooms"        // Pièces
  | "floors"       // Étages
  | "cards";       // Scènes, Routines, Groupes, Smart

export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Retourne les classes Tailwind de grille selon le type de contenu et le mode d'affichage
 */
export function getGridColumns(contentType: ContentType, displayMode: DisplayMode): string {
  const layouts: Record<ContentType, Record<DisplayMode, string>> = {
    devices: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3",
      panel: "grid-cols-3",
    },
    rooms: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-2",
      panel: "grid-cols-3",
    },
    floors: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-1",
      panel: "grid-cols-2",
    },
    cards: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3",
      panel: "grid-cols-3",
    },
  };

  return layouts[contentType][displayMode];
}

/**
 * Retourne les classes complètes de la grille avec gap
 */
export function getGridClasses(contentType: ContentType, displayMode: DisplayMode): string {
  const columns = getGridColumns(contentType, displayMode);
  return `grid ${columns} gap-4`;
}
