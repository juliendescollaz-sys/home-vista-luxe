import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import Onboarding from "@/pages/Onboarding";
import Auth from "@/pages/Auth";
import { useAuth } from "@/hooks/useAuth";
import { useInitializeConnection } from "@/hooks/useInitializeConnection";
import { useHAClient } from "@/hooks/useHAClient";
import { useHARefreshOnForeground } from "@/hooks/useHARefreshOnForeground";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useOrientationLock } from "@/hooks/useOrientationLock";
import { OrientationOverlay } from "@/components/OrientationOverlay";
import { IOSVisibilityGuard } from "@/components/IOSVisibilityGuard";
import { MobileRootLayout } from "@/ui/mobile/MobileRootLayout";
import { TabletRootLayout } from "@/ui/tablet/TabletRootLayout";
import { PanelRootLayout } from "@/ui/panel/PanelRootLayout";
import { PanelOnboarding } from "@/ui/panel/PanelOnboarding";

// Lazy load pages avec dependencies lourdes
const Admin = lazy(() => import("@/pages/Admin"));
const OnboardingScan = lazy(() => import("@/pages/OnboardingScan"));
const OnboardingManual = lazy(() => import("@/pages/OnboardingManual"));

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const connection = useHAStore((state) => state.connection);
  const isConnected = useHAStore((state) => state.isConnected);
  const hasValidConnection = !!(connection && connection.url && connection.token);
  const [showBackButton, setShowBackButton] = useState(false);
  const navigate = useNavigate();
  const { displayMode } = useDisplayMode();

  // En mode Panel, vérifier si l'onboarding a déjà été complété
  const [panelOnboardingCompleted, setPanelOnboardingCompleted] = useState(() => {
    if (displayMode !== "panel") return false;
    try {
      return window.localStorage.getItem("neolia_panel_onboarding_completed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // En mode Panel : jamais de bouton "Retour à la configuration"
    if (!hasValidConnection || isConnected || displayMode === "panel") {
      setShowBackButton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowBackButton(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [hasValidConnection, isConnected, displayMode]);

  // Cas 1 : config HA présente mais WebSocket pas encore connecté
  // → on NE bloque pas le mode PANEL ici, sinon il reste coincé sur "Connexion en cours..."
  if (displayMode !== "panel" && hasValidConnection && !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-muted-foreground">Connexion en cours...</div>
          {showBackButton && (
            <button
              onClick={() => navigate("/onboarding/manual")}
              className="mt-4 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Retour à la configuration
            </button>
          )}
        </div>
      </div>
    );
  }

  // Cas 2 : aucune configuration Home Assistant
  if (!hasValidConnection) {
    // En mode PANEL : 
    // - Si l'onboarding n'a jamais été complété → afficher PanelOnboarding
    // - Si l'onboarding a été complété mais la connexion est perdue → laisser passer (erreur affichée dans le layout)
    if (displayMode === "panel") {
      if (!panelOnboardingCompleted) {
        return <PanelOnboarding />;
      }
      // Onboarding déjà fait mais config perdue → on laisse passer, 
      // le layout affichera une erreur de connexion
      console.log("[PrivateRoute] Panel: onboarding complété mais config perdue, on laisse passer");
    } else {
      // En mobile/tablette : onboarding classique
      return <Navigate to="/onboarding" />;
    }
  }

  // Cas 3 : connexion OK (ou mode PANEL avec config mais WS pas encore up) → rendu normal
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Initialisation de la connexion HA (restaure url/token depuis le storage et met à jour le store)
  const isInitialized = useInitializeConnection();
  const { displayMode } = useDisplayMode();

  // Établir la connexion WebSocket dès que les credentials sont restaurés
  useHAClient();

  // Rafraîchir les entités au retour au premier plan
  useHARefreshOnForeground();

  // Disable pinch-zoom and double-tap zoom for native-like PWA behavior
  useEffect(() => {
    let lastTouchEnd = 0;

    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("touchmove", preventPinchZoom, { passive: false });
    document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventPinchZoom);
      document.removeEventListener("touchend", preventDoubleTapZoom);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <IOSVisibilityGuard />
            <div className={`mode-${displayMode}`}>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Routes publiques (onboarding, auth, admin) */}
                  <Route path="/auth" element={<Auth />} />

                  {/* Onboarding : dépend du mode */}
                  <Route path="/onboarding" element={displayMode === "panel" ? <PanelOnboarding /> : <Onboarding />} />
                  <Route
                    path="/onboarding/scan"
                    element={
                      <Suspense fallback={<LoadingScreen />}>
                        <OnboardingScan />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/onboarding/manual"
                    element={
                      <Suspense fallback={<LoadingScreen />}>
                        <OnboardingManual />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <Suspense fallback={<LoadingScreen />}>
                          <Admin />
                        </Suspense>
                      </AdminRoute>
                    }
                  />

                  {/* Routes protégées avec routage par mode d'affichage */}
                  <Route
                    path="/*"
                    element={
                      <PrivateRoute>
                        <AppContent displayMode={displayMode} />
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

/**
 * Contenu de l'app avec gestion de l'orientation
 */
function AppContent({ displayMode }: { displayMode: "mobile" | "tablet" | "panel" }) {
  const { showRotateOverlay, showPortraitSuggestion } = useOrientationLock(displayMode);

  return (
    <>
      {/* Overlay bloquant pour mobile en paysage */}
      {showRotateOverlay && <OrientationOverlay type="blocking" />}

      {/* Suggestion non bloquante pour tablet/panel en portrait */}
      {showPortraitSuggestion && <OrientationOverlay type="suggestion" />}

      {/* Contenu principal selon le mode */}
      {displayMode === "panel" && <PanelRootLayout />}
      {displayMode === "tablet" && <TabletRootLayout />}
      {displayMode === "mobile" && <MobileRootLayout />}
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Chargement...</div>
    </div>
  );
}

export default App;
