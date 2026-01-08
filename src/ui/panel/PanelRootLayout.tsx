import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
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
import IntercomTest from "@/pages/IntercomTest";
import { hasHaConfig } from "@/services/haConfig";
import { useNeoliaPlansPreloader } from "@/hooks/useNeoliaPlansPreloader";
import { useNeoliaPanelConfigLoader } from "@/hooks/useNeoliaPanelConfigLoader";
import { TopBarPanel } from "@/components/TopBarPanel";
import { NeoliaLoadingScreen } from "@/ui/panel/components/NeoliaLoadingScreen";
import { IncomingCallOverlay } from "@/components/panel/IncomingCallOverlay";
import { usePanelIntercom } from "@/hooks/usePanelIntercom";

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

export function PanelRootLayout() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const location = useLocation();

  useNeoliaPlansPreloader();
  useNeoliaPanelConfigLoader();

  // Hook interphone
  const {
    isConfigured: intercomConfigured,
    currentCall,
    callState,
    callerName,
    videoUrl,
    config: intercomConfig,
    answer,
    hangup,
    openDoor,
    toggleMicrophone,
    setPlaybackGain,
  } = usePanelIntercom();

  // Afficher l'overlay d'appel si un appel est en cours
  const showCallOverlay = intercomConfigured && currentCall !== null && callState !== null;

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];
    if (path.startsWith("/rooms/")) return "Détails pièce";
    if (path.startsWith("/media-player/")) return "Lecteur média";
    return "Neolia";
  }, [location.pathname]);

  // --- Transition overlay ---
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayFading, setOverlayFading] = useState(false);

  // Vérifier config HA
  useEffect(() => {
    let mounted = true;
    hasHaConfig().then((result) => {
      if (mounted) setHasConfig(result);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Overlay ultra-stable: reste affiché pendant montage + au moins quelques frames + fade-out
  useEffect(() => {
    // Tant qu'on ne sait pas si on a la config, on garde l'overlay.
    if (hasConfig === null) {
      setShowOverlay(true);
      setOverlayFading(false);
      return;
    }

    // Si on vient d'onboarding, on force une transition plus “cinéma”.
    let fromOnboarding = false;
    try {
      fromOnboarding = sessionStorage.getItem("neolia_panel_transition") === "1";
      if (fromOnboarding) sessionStorage.removeItem("neolia_panel_transition");
    } catch {
      // ignore
    }

    // On laisse le layout se peindre dessous sur 2 frames minimum
    // + optionnellement un délai léger si on vient d'onboarding
    const extra = fromOnboarding ? 180 : 60;

    let raf1 = 0;
    let raf2 = 0;
    const t0 = performance.now();

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const elapsed = performance.now() - t0;
        const remaining = Math.max(0, extra - elapsed);

        window.setTimeout(() => {
          setOverlayFading(true);
          window.setTimeout(() => {
            setShowOverlay(false);
            setOverlayFading(false);
          }, 220); // durée du fade
        }, remaining);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hasConfig]);

  // Layout normal (toujours rendu quand hasConfig !== null) — l'overlay masque le montage.
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="panel-layout flex flex-col h-screen w-screen overflow-hidden bg-background">
        <TopBarPanel title={pageTitle} />

        <div className="flex flex-1 min-h-0">
          <PanelSidebar />

          <main className="flex-1 min-h-0 overflow-y-auto">
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<PanelHome />} />
              <Route path="/rooms" element={<PanelRooms />} />
              <Route path="/rooms/:areaId" element={<PanelRoomDetails />} />
              <Route path="/favorites" element={<PanelFavorites />} />
              <Route path="/scenes" element={<PanelScenes />} />
              <Route path="/routines" element={<PanelRoutines />} />
              <Route path="/groupes" element={<PanelGroupes />} />
              <Route path="/smart" element={<PanelSmart />} />
              <Route path="/settings" element={<PanelSettings />} />
              <Route path="/media-player/:entityId" element={<PanelMediaPlayerDetails />} />
              <Route path="/sonos-zones" element={<PanelSonosZones />} />
              <Route path="/floor-plan-editor" element={<FloorPlanEditor />} />
              <Route path="/dev" element={<PanelDev />} />
              <Route path="/intercom-test" element={<IntercomTest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>

        {/* Overlay global: masque absolument tout, évite tout scintillement */}
        {showOverlay && (
          <div
            className={[
              "fixed inset-0 z-[9999] bg-background",
              "transition-opacity duration-200",
              overlayFading ? "opacity-0 pointer-events-none" : "opacity-100",
            ].join(" ")}
          >
            <NeoliaLoadingScreen
              title="Chargement…"
              subtitle="Préparation de l'interface et synchronisation…"
            />
          </div>
        )}

        {/* Overlay appel entrant interphone */}
        <IncomingCallOverlay
          visible={showCallOverlay}
          callerName={callerName || "Interphone"}
          callState={callState as "ringing" | "incall" | "ended"}
          videoUrl={videoUrl || undefined}
          onAnswer={answer}
          onHangup={hangup}
          onOpenDoor={openDoor}
          onToggleMic={toggleMicrophone}
          onSetPlaybackGain={setPlaybackGain}
          ringtone={intercomConfig.ringtone.name}
          ringtoneVolume={intercomConfig.ringtone.volume}
          videoDelayAfterDoor={intercomConfig.door.videoDelayAfterOpen}
        />
      </div>
    </SidebarProvider>
  );
}

export default PanelRootLayout;
