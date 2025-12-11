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

// 🔌 MQTT PANEL – on l’importe ici
import { connectNeoliaMqttPanel } from "@/components/neolia/bootstrap/neoliaMqttClient";

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

  // ✅ DEBUG / INIT MQTT PANEL
  // On force une tentative de connexion MQTT au démarrage du Panel.
  useEffect(() => {
    console.log("[PanelRootLayout][MQTT] Tentative de connexion Panel → MQTT (debug)");

    connectNeoliaMqttPanel(
      () => {
        console.log("[PanelRootLayout][MQTT] Connexion MQTT Panel OK (debug)");
      },
      (error) => {
        console.error("[PanelRootLayout][MQTT] Erreur connexion MQTT Panel (debug):", error?.message || error);
      },
    ).catch((err) => {
      console.error("[PanelRootLayout][MQTT] Exception lors de la connexion MQTT Panel (debug):", err);
    });
  }, []);

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

  // Écran de chargement
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
