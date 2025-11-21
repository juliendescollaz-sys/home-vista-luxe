import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TabletSidebar } from "@/components/TabletSidebar";
import { PanelHome } from "./pages/PanelHome";
import { PanelOnboarding } from "./PanelOnboarding";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import FloorPlanEditor from "@/pages/FloorPlanEditor";
import { hasHaConfig } from "@/services/haConfig";

/**
 * Layout racine pour l'interface PANEL (écran mural)
 */
export function PanelRootLayout() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);

  useEffect(() => {
    hasHaConfig().then(setHasConfig);
  }, []);

  if (hasConfig === false) {
    return <PanelOnboarding />;
  }

  if (hasConfig === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Config OK → layout normal
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="panel-layout flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar fixe */}
        <TabletSidebar />

        {/* Colonne principale */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Header fixe */}
          <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav shrink-0">
            <SidebarTrigger />
          </header>

          {/* Contenu scrollable uniquement ici */}
          <main className="flex-1 min-h-0 overflow-y-auto">
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<PanelHome />} />
              <Route path="/floor-plan-editor" element={<FloorPlanEditor />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<PanelHome />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
