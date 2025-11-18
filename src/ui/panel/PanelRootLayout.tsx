import { Routes, Route } from "react-router-dom";
import { PanelHome } from "./pages/PanelHome";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

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
 * Pour l'instant, affiche un dashboard de base.
 * TODO : Implémenter les composants spécifiques panel
 */
export function PanelRootLayout() {
  return (
    <div className="panel-layout min-h-screen bg-background">
      <Routes>
        {/* Dashboard principal du panneau */}
        <Route path="/" element={<PanelHome />} />
        
        {/* Settings (potentiellement protégés par PIN) */}
        <Route path="/settings" element={<Settings />} />

        {/* Toutes les autres routes redirigent vers le dashboard */}
        <Route path="*" element={<PanelHome />} />
      </Routes>
    </div>
  );
}
