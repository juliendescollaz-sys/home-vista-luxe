import { useHAStore } from "@/store/useHAStore";
import { WifiOff } from "lucide-react";

export function ConnectionBanner() {
  const connectionIssueCount = useHAStore((state) => state.connectionIssueCount);

  // Si moins de 3 erreurs consécutives de commande, on ne montre rien
  if (connectionIssueCount < 3) {
    return null;
  }

  // À partir de 3 échecs, on montre la bannière d'alerte
  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 flex justify-center">
      <div className="bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">Problème de connexion à Home Assistant</span>
      </div>
    </div>
  );
}
