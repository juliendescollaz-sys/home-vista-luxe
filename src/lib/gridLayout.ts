/**
 * Configuration de grille homogene pour toutes les pages
 * Panel 8" : 2 colonnes pour tiles plus grandes et lisibles a 1m
 * Tablet : 3 colonnes
 */

export type ContentType =
  | "devices"      // Appareils, Media Players
  | "rooms"        // Pieces
  | "floors"       // Etages
  | "cards";       // Scenes, Routines, Groupes, Smart

export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Retourne les classes Tailwind de grille selon le type de contenu et le mode d'affichage
 * Panel 8" : 2 colonnes pour maximiser la taille des tiles (lisibilite a 1m)
 */
export function getGridColumns(contentType: ContentType, displayMode: DisplayMode): string {
  const layouts: Record<ContentType, Record<DisplayMode, string>> = {
    devices: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3",
      panel: "grid-cols-2",  // 2 colonnes pour tiles plus grandes
    },
    rooms: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3",
      panel: "grid-cols-2",  // 2 colonnes pour cards pieces plus grandes
    },
    floors: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3",
      panel: "grid-cols-2",
    },
    cards: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3",
      panel: "grid-cols-2",  // 2 colonnes pour scenes/routines/groupes
    },
  };

  return layouts[contentType][displayMode];
}

/**
 * Retourne les classes completes de la grille avec gap
 * Panel : gap-5 pour espacement plus genereux
 */
export function getGridClasses(contentType: ContentType, displayMode: DisplayMode): string {
  const columns = getGridColumns(contentType, displayMode);
  const gap = displayMode === "panel" ? "gap-5" : "gap-4";
  return `grid ${columns} ${gap}`;
}
