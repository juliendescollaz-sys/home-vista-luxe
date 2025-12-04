/**
 * Page Smart pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Smart.tsx)
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */

export function PanelSmart() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="max-w-screen-xl mx-auto px-6 py-6 text-center">
        <p className="text-muted-foreground">Fonctionnalités intelligentes à venir...</p>
      </div>
    </div>
  );
}
