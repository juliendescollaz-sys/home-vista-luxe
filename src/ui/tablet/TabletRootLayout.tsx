import { Routes, Route } from "react-router-dom";
import { ConnectionModeProvider } from "@/components/ConnectionModeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTransition } from "@/components/PageTransition";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TabletSidebar } from "@/components/TabletSidebar";
import { useNeoliaPlansPreloader } from "@/hooks/useNeoliaPlansPreloader";
import Home from "@/pages/Home";
import Rooms from "@/pages/Rooms";
import RoomDetails from "@/pages/RoomDetails";
import MediaPlayerDetails from "@/pages/MediaPlayerDetails";
import Favorites from "@/pages/Favorites";
import Scenes from "@/pages/Scenes";
import Routines from "@/pages/Routines";
import Groupes from "@/pages/Groupes";
import Smart from "@/pages/Smart";
import Settings from "@/pages/Settings";
import Dev from "@/pages/Dev";
import NotFound from "@/pages/NotFound";
import SonosZones from "@/pages/SonosZones";
import FloorPlanEditor from "@/pages/FloorPlanEditor";

/**
 * Layout racine pour l'interface TABLET (iPad, Galaxy Tab)
 */
export function TabletRootLayout() {
  // Précharger les plans Neolia dès la connexion HA
  useNeoliaPlansPreloader();

  return (
    <ConnectionModeProvider>
      <SidebarProvider defaultOpen={true}>
        {/* Layout plein écran : sidebar fixe + header fixe + contenu scrollable */}
        <div className="flex h-screen w-screen overflow-hidden bg-background">
          {/* Sidebar fixe à gauche */}
          <TabletSidebar />

          {/* Colonne principale */}
          <div className="flex flex-1 flex-col min-w-0 min-h-0">
            {/* Header fixe */}
            <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav shrink-0">
              <SidebarTrigger />
            </header>

            {/* Contenu : seule zone scrollable */}
            <main className="flex-1 min-h-0 overflow-y-auto">
              <ScrollToTop />
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/rooms/:areaId" element={<RoomDetails />} />
                  <Route path="/floor-plan-editor" element={<FloorPlanEditor />} />
                  <Route path="/media-player/:entityId" element={<MediaPlayerDetails />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/scenes" element={<Scenes />} />
                  <Route path="/routines" element={<Routines />} />
                  <Route path="/groupes" element={<Groupes />} />
                  <Route path="/smart" element={<Smart />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/dev" element={<Dev />} />
                  <Route path="/sonos-zones" element={<SonosZones />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ConnectionModeProvider>
  );
}
