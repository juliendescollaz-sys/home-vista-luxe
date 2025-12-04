/**
 * Page Routines pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Routines.tsx)
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */

export function PanelRoutines() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="max-w-screen-xl mx-auto px-6 py-6 text-center">
        <p className="text-muted-foreground">Vos routines automatiques apparaîtront ici...</p>
      </div>
    </div>
  );
}
