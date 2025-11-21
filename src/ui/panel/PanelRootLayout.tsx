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
 * Layout racine pour l'interface PANEL (S563 - panneau mural)
 * 
 * Comportement :
 * - Dashboard principal plein écran, avec très gros boutons et contrôles
 * - UX pensée "télécommande murale" :
 *   - Une vue principale "Home/Room"
 *   - Priorité au contrôle immédiat (lumières, scènes, musique, interphone)
 * - Navigation limitée (très peu de menus, pas de pages de profil utilisateur standard)
 * - Certaines fonctions sensibles (reset, gestion de comptes, etc.) peuvent être 
 *   cachées ou protégées par PIN dans le mode PANEL
 * 
 * En mode PANEL, si aucune configuration HA n'existe, affiche l'écran d'onboarding
 * pour récupérer automatiquement la config depuis NeoliaServer.
 */
export function PanelRootLayout() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);

  useEffect(() => {
    // Vérifier si une config HA existe déjà
    hasHaConfig().then(setHasConfig);
  }, []);

  // Affichage de l'onboarding si pas de config
  if (hasConfig === false) {
    return <PanelOnboarding />;
  }

  // Loading state pendant la vérification
  if (hasConfig === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Config existe, afficher le layout normal
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="panel-layout min-h-screen flex w-full bg-background">
        <TabletSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav">
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-auto">
            <ScrollToTop />
            <Routes>
              {/* Dashboard principal du panneau */}
              <Route path="/" element={<PanelHome />} />
              <Route path="/floor-plan-editor" element={<FloorPlanEditor />} />
              
              {/* Settings (potentiellement protégés par PIN) */}
              <Route path="/settings" element={<Settings />} />

              {/* Toutes les autres routes redirigent vers le dashboard */}
              <Route path="*" element={<PanelHome />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
