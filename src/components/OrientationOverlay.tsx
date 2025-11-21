import { RotateCw } from "lucide-react";

interface OrientationOverlayProps {
  type: "blocking" | "suggestion";
}

/**
 * Overlay pour gérer l'orientation de l'écran
 * 
 * - blocking: overlay plein écran (mobile en paysage)
 * - suggestion: bandeau discret en haut (tablet en portrait)
 */
export const OrientationOverlay = ({ type }: OrientationOverlayProps) => {
  if (type === "blocking") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/98 px-8 text-center">
        <div className="animate-bounce mb-6">
          <RotateCw className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-3">
          Tournez votre téléphone
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Neolia s'utilise en mode portrait sur mobile pour une meilleure expérience.
        </p>
      </div>
    );
  }

  // Suggestion non bloquante pour tablet
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground px-4 py-2 text-center text-sm backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2">
        <RotateCw className="h-4 w-4" />
        <span>Astuce : retournez votre tablette en paysage pour une meilleure expérience.</span>
      </div>
    </div>
  );
};
