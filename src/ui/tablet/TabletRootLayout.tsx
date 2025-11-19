import { Routes, Route, Navigate } from "react-router-dom";
import { ConnectionModeProvider } from "@/components/ConnectionModeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import Home from "@/pages/Home";
import Rooms from "@/pages/Rooms";
import RoomDetails from "@/pages/RoomDetails";
import MediaPlayerDetails from "@/pages/MediaPlayerDetails";
import Favorites from "@/pages/Favorites";
import Scenes from "@/pages/Scenes";
import Activity from "@/pages/Activity";
import Settings from "@/pages/Settings";
import Dev from "@/pages/Dev";
import NotFound from "@/pages/NotFound";
import SonosZones from "@/pages/SonosZones";

/**
 * Layout racine pour l'interface TABLET (iPad, Galaxy Tab)
 * 
 * Comportement :
 * - Possibilité de layout en 2 colonnes (liste à gauche + détail à droite)
 * - Profiter de la largeur pour afficher plus d'infos sur un seul écran
 * - Fonctionnalités globalement identiques au mobile, mais présentation plus riche
 * - Détection automatique local/cloud via ConnectionModeProvider
 * 
 * Pour l'instant, réutilise les mêmes composants que le mobile.
 * TODO : Implémenter des layouts spécifiques tablet (split-view, etc.)
 */
export function TabletRootLayout() {
  return (
    <ConnectionModeProvider>
      <ScrollToTop />
      <div className="tablet-layout">
        {/* Note : Pour l'instant, on réutilise les mêmes pages que mobile */}
        {/* TODO : Créer des variantes optimisées pour tablet avec split-view */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:areaId" element={<RoomDetails />} />
          <Route path="/media-player/:entityId" element={<MediaPlayerDetails />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/scenes" element={<Scenes />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dev" element={<Dev />} />
          <Route path="/sonos-zones" element={<SonosZones />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ConnectionModeProvider>
  );
}
