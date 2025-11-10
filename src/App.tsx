import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useHAStore } from "./store/useHAStore";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import Favorites from "./pages/Favorites";
import Scenes from "./pages/Scenes";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import Dev from "./pages/Dev";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import { useInitializeConnection } from "./hooks/useInitializeConnection";
import { useHAClient } from "./hooks/useHAClient";

// Lazy load pages avec dependencies lourdes
const OnboardingScan = lazy(() => import("./pages/OnboardingScan"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const connection = useHAStore((state) => state.connection);
  const isConnected = useHAStore((state) => state.isConnected);
  
  console.log("🔐 PrivateRoute - connection:", connection);
  console.log("🔐 PrivateRoute - isConnected:", isConnected);
  
  // Check if we have valid connection data
  const hasValidConnection = connection && connection.url && connection.token;
  
  // Si on a des credentials valides mais qu'on n'est pas encore connecté, afficher un loader
  if (hasValidConnection && !isConnected) {
    console.log("⏳ En attente de connexion...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="animate-pulse text-muted-foreground">Connexion en cours...</div>
        </div>
      </div>
    );
  }
  
  // Si pas de credentials du tout, rediriger vers onboarding
  if (!hasValidConnection) {
    console.log("❌ Pas de credentials, redirection vers onboarding");
    return <Navigate to="/onboarding" />;
  }
  
  // Si connecté avec des credentials valides, afficher la page
  console.log("✅ Accès autorisé");
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
  
  // Établir la connexion WebSocket dès que les credentials sont restaurés
  useHAClient();

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/scan" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
                <OnboardingScan />
              </Suspense>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
                  <Admin />
                </Suspense>
              </AdminRoute>
            } />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/rooms"
              element={
                <PrivateRoute>
                  <Rooms />
                </PrivateRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <PrivateRoute>
                  <Favorites />
                </PrivateRoute>
              }
            />
            <Route
              path="/scenes"
              element={
                <PrivateRoute>
                  <Scenes />
                </PrivateRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <PrivateRoute>
                  <Activity />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/dev"
              element={
                <PrivateRoute>
                  <Dev />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
        </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
