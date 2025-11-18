import { useHAStore } from "@/store/useHAStore";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

/**
 * Page d'accueil pour le mode PANEL (S563)
 * 
 * Dashboard mural plein écran avec :
 * - Gros boutons tactiles pour les contrôles principaux
 * - Affichage des pièces et équipements actifs
 * - Accès rapide aux scènes et aux contrôles Sonos
 * - UI optimisée pour un écran fixe en paysage
 * 
 * TODO : Implémenter les composants spécifiques pour le panneau :
 * - Grille de pièces avec contrôles directs
 * - Contrôles Sonos intégrés
 * - Scènes favoris en accès direct
 * - Interphone (si disponible)
 */
export function PanelHome() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <img 
          src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
          alt="Neolia" 
          className="h-12 w-auto"
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
          className="h-14 w-14"
        >
          <Settings className="h-7 w-7" />
        </Button>
      </header>

      {/* Dashboard principal */}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-8">Tableau de bord</h1>

        {/* Placeholder pour le contenu du panneau */}
        <div className="grid grid-cols-3 gap-6">
          {/* Pièces principales */}
          <div className="col-span-2 bg-card rounded-2xl p-8 shadow-card">
            <h2 className="text-3xl font-semibold mb-6">Pièces</h2>
            <div className="grid grid-cols-2 gap-4">
              {areas.slice(0, 4).map((area) => (
                <button
                  key={area.area_id}
                  className="bg-muted hover:bg-muted/80 rounded-xl p-6 text-left transition-colors"
                >
                  <div className="text-2xl font-medium">{area.name}</div>
                  <div className="text-lg text-muted-foreground mt-2">
                    {/* TODO : Afficher le nombre d'appareils actifs */}
                    Appareils actifs
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contrôles rapides */}
          <div className="bg-card rounded-2xl p-8 shadow-card">
            <h2 className="text-3xl font-semibold mb-6">Contrôles</h2>
            <div className="space-y-4">
              <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl p-6 text-2xl font-medium transition-colors">
                Tout éteindre
              </button>
              <button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl p-6 text-2xl font-medium transition-colors">
                Mode Soirée
              </button>
              <button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl p-6 text-2xl font-medium transition-colors">
                Mode Nuit
              </button>
            </div>
          </div>
        </div>

        {/* Message d'implémentation */}
        <div className="mt-12 bg-muted/50 rounded-2xl p-8 text-center">
          <p className="text-2xl text-muted-foreground">
            🚧 Interface PANEL en cours de développement
          </p>
          <p className="text-lg text-muted-foreground mt-2">
            Cette interface sera optimisée pour le panneau mural S563
          </p>
        </div>
      </div>
    </div>
  );
}
