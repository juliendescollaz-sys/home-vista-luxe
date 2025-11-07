import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useHAStore } from "./store/useHAStore";
import { ErrorBoundary } from "./components/ErrorBoundary";
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

// Lazy load pages avec dependencies lourdes
const OnboardingScan = lazy(() => import("./pages/OnboardingScan"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const connection = useHAStore((state) => state.connection);
  const isConnected = useHAStore((state) => state.isConnected);
  
  // Check if we have valid connection data
  const hasValidConnection = connection && connection.url && connection.token;
  
  return (isConnected && hasValidConnection) ? <>{children}</> : <Navigate to="/onboarding" />;
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
  const isConnected = useHAStore((state) => state.isConnected);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
