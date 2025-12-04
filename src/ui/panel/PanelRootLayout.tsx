import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TabletSidebar } from "@/components/TabletSidebar";
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
 */
export function PanelRootLayout() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const location = useLocation();

  // Précharger les plans Neolia dès la connexion HA
  useNeoliaPlansPreloader();

  // Déterminer le titre de la page actuelle
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    
    // Vérifier les correspondances exactes d'abord
    if (ROUTE_TITLES[path]) {
      return ROUTE_TITLES[path];
    }
    
    // Gérer les routes dynamiques
    if (path.startsWith("/rooms/")) {
      return "Détails pièce";
    }
    if (path.startsWith("/media-player/")) {
      return "Lecteur média";
    }
    
    return "";
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

  // Config ou pas : on reste toujours dans le layout PANEL,
  // plus jamais de retour automatique vers PanelOnboarding.
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="panel-layout flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar fixe */}
        <TabletSidebar />

        {/* Colonne principale */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Header fixe avec titre centré */}
          <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav shrink-0 relative">
            <SidebarTrigger />

            {/* Titre centré */}
            {pageTitle && (
              <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold">
                {pageTitle}
              </h1>
            )}
          </header>

          {/* Contenu scrollable uniquement ici */}
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
              <Route path="/media-player/:entityId" element={<PanelMediaPlayerDetails />} />
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
