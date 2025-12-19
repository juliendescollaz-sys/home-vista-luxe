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
import { useNeoliaPanelConfigLoader } from "@/hooks/useNeoliaPanelConfigLoader";
import { TopBarPanel } from "@/components/TopBarPanel";
import { NeoliaLoadingScreen } from "@/ui/panel/components/NeoliaLoadingScreen";

// Mapping des routes vers les titres
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
 * Layout PANEL (murale)
 * → TopBarPanel pleine largeur
 * → Sidebar en dessous
 * → Contenu scrollable
 */
export function PanelRootLayout() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const location = useLocation();

  // Préchargement des plans dès connexion HA
  useNeoliaPlansPreloader();

  // Chargement de la config Neolia Panel depuis HA (en arrière-plan)
  useNeoliaPanelConfigLoader();

  // Déterminer le titre de la page
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];
    if (path.startsWith("/rooms/")) return "Détails pièce";
    if (path.startsWith("/media-player/")) return "Lecteur média";

    return "Neolia";
  }, [location.pathname]);

  // Vérifier si config HA présente
  useEffect(() => {
    let mounted = true;

    hasHaConfig().then((result) => {
      if (mounted) setHasConfig(result);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Écran de chargement (même spinner que l'onboarding => transition invisible)
  if (hasConfig === null) {
    return (
      <NeoliaLoadingScreen
        title="Chargement…"
        subtitle="Préparation de l’interface et synchronisation avec Home Assistant…"
      />
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="panel-layout flex flex-col h-screen w-screen overflow-hidden bg-background">
        {/* HEADER PANEL PLEINE LARGEUR */}
        <TopBarPanel title={pageTitle} />

        {/* LIGNE PRINCIPALE : Sidebar + Contenu */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar (sous le header) */}
          <PanelSidebar />

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

export default PanelRootLayout;
