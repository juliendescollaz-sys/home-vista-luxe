import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
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

// Lazy load pages avec dependencies lourdes
const OnboardingScan = lazy(() => import("@/pages/OnboardingScan"));
const OnboardingManual = lazy(() => import("@/pages/OnboardingManual"));

/**
 * Layout racine pour l'interface MOBILE (smartphone)
 * 
 * Comportement :
 * - Navigation type barre en bas (tab bar)
 * - Écrans empilés, affichage optimisé pour une main
 * - UI compacte et tactile
 * 
 * Ce layout réutilise les pages existantes de l'application,
 * qui sont déjà optimisées pour mobile.
 */
export function MobileRootLayout() {
  return (
    <Routes>
      {/* Routes principales (avec PrivateRoute wrapper dans App.tsx) */}
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

      {/* Onboarding */}
      <Route
        path="/onboarding/scan"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <OnboardingScan />
          </Suspense>
        }
      />
      <Route
        path="/onboarding/manual"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <OnboardingManual />
          </Suspense>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Chargement...</div>
    </div>
  );
}
