import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PanelSidebar } from "@/components/PanelSidebar";
import { PanelHome } from "./pages/PanelHome";
import { PanelRooms } from "./pages/PanelRooms";
import { PanelRoomDetails } from "./pages/PanelRoomDetails";
import { PanelFavorites } from "./pages/PanelFavorites";
import { PanelScenes } from "./pages/PanelScenes";
import { PanelRoutines } from "./pages/PanelRoutines";
import { PanelGroupes } from "./pages/PanelGroupes";
import { PanelSmart } from "./pages/PanelSmart";
import { PanelSettings } from "./pages/PanelSettings";
import { PanelMediaPlayerDetails } from "./pages/PanelMediaPlayerDetails";
import { PanelSonosZones } from "./pages/PanelSonosZones";
import { PanelDev } from "./pages/PanelDev";
import NotFound from "@/pages/NotFound";
import FloorPlanEditor from "@/pages/FloorPlanEditor";
import { hasHaConfig } from "@/services/haConfig";
import { useNeoliaPlansPreloader } from "@/hooks/useNeoliaPlansPreloader";
import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

// Mapping des routes vers les titres de page
const ROUTE_TITLES: Record<string, string> = {
  "/": "Accueil",
  "/rooms": "Maison",
  "/favorites": "Favoris",
  "/scenes": "Scènes",
  "/routines": "Routines",
  "/groupes": "Groupes",
  "/smart": "Smarthome",
  "/settings": "Paramètres",
  "/sonos-zones": "Zones Sonos",
  "/dev": "Développement",
  "/floor-plan-editor": "Éditeur de plan",
};

/**
 * Layout racine pour l'interface PANEL (écran mural)
 * Sidebar à gauche + header local dans la colonne de droite
 * (pas de barre fixe sur toute la largeur).
 */
export function PanelRootLayout() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const location = useLocation();
  const { theme } = useTheme();

  // Précharger les plans Neolia dès la connexion HA
  useNeoliaPlansPreloader();

  // Déterminer le titre de la page actuelle
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    // Correspondances exactes
    if (ROUTE_TITLES[path]) {
      return ROUTE_TITLES[path];
    }

    // Routes dynamiques
    if (path.startsWith("/rooms/")) {
      return "Détails pièce";
    }
    if (path.startsWith("/media-player/")) {
      return "Lecteur média";
    }

    return "Neolia";
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    hasHaConfig().then((result) => {
      if (!isMounted) return;
      setHasConfig(result);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (hasConfig === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Layout PANEL : sidebar + colonne principale
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="panel-layout flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar à gauche (menu uniquement) */}
        <PanelSidebar />

        {/* Colonne principale : header local + contenu scrollable */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Header local, NON fixed, limité à la colonne de droite */}
          <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav shrink-0">
            <img
              src={theme === "light" ? neoliaLogoDark : neoliaLogoLight}
              alt="Neolia"
              className="h-8 w-auto"
            />
            <h1 className="flex-1 text-center text-2xl font-bold -ml-8">
              {pageTitle}
            </h1>
          </header>

          {/* Zone de contenu scrollable */}
          <main className="flex-1 min-h-0 overflow-y-auto">
            <ScrollToTop />
            <Routes>
              {/* Pages principales */}
              <Route path="/" element={<PanelHome />} />
              <Route path="/rooms" element={<PanelRooms />} />
              <Route path="/rooms/:areaId" element={<PanelRoomDetails />} />
              <Route path="/favorites" element={<PanelFavorites />} />
              <Route path="/scenes" element={<PanelScenes />} />
              <Route path="/routines" element={<PanelRoutines />} />
              <Route path="/groupes" element={<PanelGroupes />} />
              <Route path="/smart" element={<PanelSmart />} />
              <Route path="/settings" element={<PanelSettings />} />

              {/* Pages secondaires */}
              <Route
                path="/media-player/:entityId"
                element={<PanelMediaPlayerDetails />}
              />
              <Route path="/sonos-zones" element={<PanelSonosZones />} />
              <Route path="/floor-plan-editor" element={<FloorPlanEditor />} />
              <Route path="/dev" element={<PanelDev />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default PanelRootLayout;
