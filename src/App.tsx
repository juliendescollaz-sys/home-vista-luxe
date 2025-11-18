import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useHAStore } from "./store/useHAStore";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import { useAuth } from "./hooks/useAuth";
import { useInitializeConnection } from "./hooks/useInitializeConnection";
import { useHAClient } from "./hooks/useHAClient";
import { useHARefreshOnForeground } from "./hooks/useHARefreshOnForeground";
import { useReloadOnForegroundIOS } from "./hooks/useReloadOnForegroundIOS";
import { useDisplayMode } from "./hooks/useDisplayMode";
import { MobileRootLayout } from "./ui/mobile/MobileRootLayout";
import { TabletRootLayout } from "./ui/tablet/TabletRootLayout";
import { PanelRootLayout } from "./ui/panel/PanelRootLayout";

// Lazy load pages avec dependencies lourdes
const Admin = lazy(() => import("./pages/Admin"));
const OnboardingScan = lazy(() => import("./pages/OnboardingScan"));
const OnboardingManual = lazy(() => import("./pages/OnboardingManual"));

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const connection = useHAStore((state) => state.connection);
  const isConnected = useHAStore((state) => state.isConnected);
  const hasValidConnection = connection && connection.url && connection.token;
  const [showBackButton, setShowBackButton] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasValidConnection || isConnected) {
      setShowBackButton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowBackButton(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [hasValidConnection, isConnected]);

  if (hasValidConnection && !isConnected) {
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
    return <Navigate to="/onboarding" />;
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
  // Sur iOS uniquement : force un reload complet au retour au premier plan
  useReloadOnForegroundIOS();
  
  const isInitialized = useInitializeConnection();
  
  // Établir la connexion WebSocket dès que les credentials sont restaurés
  useHAClient();
  
  // Rafraîchir les entités au retour au premier plan
  useHARefreshOnForeground();

  // Détection du mode d'affichage (mobile/tablet/panel)
  const { displayMode } = useDisplayMode();

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
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Routes publiques (onboarding, auth, admin) */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding/scan" element={
                  <Suspense fallback={<LoadingScreen />}>
                    <OnboardingScan />
                  </Suspense>
                } />
                <Route path="/onboarding/manual" element={
                  <Suspense fallback={<LoadingScreen />}>
                    <OnboardingManual />
                  </Suspense>
                } />
                <Route path="/admin" element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingScreen />}>
                      <Admin />
                    </Suspense>
                  </AdminRoute>
                } />

                {/* Routes protégées avec routage par mode d'affichage */}
                <Route path="/*" element={
                  <PrivateRoute>
                    {displayMode === "panel" && <PanelRootLayout />}
                    {displayMode === "tablet" && <TabletRootLayout />}
                    {displayMode === "mobile" && <MobileRootLayout />}
                  </PrivateRoute>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Chargement...</div>
    </div>
  );
}

export default App;
