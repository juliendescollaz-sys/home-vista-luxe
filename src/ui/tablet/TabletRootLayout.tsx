import { Routes, Route } from "react-router-dom";
import { ConnectionModeProvider } from "@/components/ConnectionModeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TabletSidebar } from "@/components/TabletSidebar";
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

/**
 * Layout racine pour l'interface TABLET (iPad, Galaxy Tab)
 * 
 * Comportement :
 * - Sidebar verticale à gauche pour navigation persistante
 * - Split-view optimisé avec sidebar collapsible
 * - Profiter de la largeur pour afficher plus d'infos sur un seul écran
 * - Fonctionnalités globalement identiques au mobile, mais présentation plus riche
 * - Détection automatique local/cloud via ConnectionModeProvider
 */
export function TabletRootLayout() {
  return (
    <ConnectionModeProvider>
      <ScrollToTop />
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
          <TabletSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Header avec trigger de sidebar */}
            <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav">
              <SidebarTrigger />
            </header>

            {/* Contenu principal */}
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/rooms/:areaId" element={<RoomDetails />} />
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
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ConnectionModeProvider>
  );
}
