/**
 * Page Routines pour le mode PANEL
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */
export function PanelRoutines() {
  return (
    <div className="w-full h-full bg-background p-4 overflow-y-auto">
      <h1 className="text-2xl font-semibold mb-6">Routines</h1>
      
      <div className="max-w-screen-xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Vos routines automatiques apparaîtront ici...</p>
      </div>
    </div>
  );
}
