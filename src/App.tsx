import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { sipService } from '@/services/sipService';
import { useIntercomStore } from '@/store/intercomStore';
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
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const navigate = useNavigate();
  const { displayMode } = useDisplayMode();

  const [panelOnboardingCompleted] = useState(() => {
    if (displayMode !== "panel") return false;
    try {
      return window.localStorage.getItem("neolia_panel_onboarding_completed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!hasValidConnection || isConnected || displayMode === "panel") {
      setShowBackButton(false);
      setConnectionTimeout(false);
      return;
    }

    const backButtonTimer = setTimeout(() => setShowBackButton(true), 5000);
    const timeoutTimer = setTimeout(() => {
      console.warn('⏱️ Connection timeout - continuing anyway');
      setConnectionTimeout(true);
    }, 15000); // 15 secondes max pour se connecter

    return () => {
      clearTimeout(backButtonTimer);
      clearTimeout(timeoutTimer);
    };
  }, [hasValidConnection, isConnected, displayMode]);

  // Si timeout dépassé, afficher l'app quand même (mode dégradé)
  if (displayMode !== "panel" && hasValidConnection && !isConnected && !connectionTimeout) {
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

  if (!hasValidConnection) {
    if (displayMode === "panel") {
      if (!panelOnboardingCompleted) return <PanelOnboarding />;
    } else {
      return <Navigate to="/onboarding" />;
    }
  }

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
  const isInitialized = useInitializeConnection();
  const { displayMode } = useDisplayMode();

  useHAClient();
  useHARefreshOnForeground();

  // SIP client is initialized from IntercomTest page using saved config
  // Don't initialize here with hardcoded values

  useEffect(() => {
    let lastTouchEnd = 0;

    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
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
                  <Route path="/auth" element={<Auth />} />

                  <Route
                    path="/onboarding"
                    element={displayMode === "panel" ? <PanelOnboarding /> : <Onboarding />}
                  />
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

function AppContent({ displayMode }: { displayMode: "mobile" | "tablet" | "panel" }) {
  const { showRotateOverlay, showPortraitSuggestion } = useOrientationLock(displayMode);

  return (
    <>
      {showRotateOverlay && <OrientationOverlay type="blocking" />}
      {showPortraitSuggestion && <OrientationOverlay type="suggestion" />}

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
