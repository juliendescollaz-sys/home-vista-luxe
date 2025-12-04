/**
 * Page Smart pour le mode PANEL
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */
export function PanelSmart() {
  return (
    <div className="w-full h-full bg-background p-4 overflow-y-auto">
      <h1 className="text-2xl font-semibold mb-6">Smarthome</h1>
      
      <div className="max-w-screen-xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Fonctionnalités intelligentes à venir...</p>
      </div>
    </div>
  );
}
