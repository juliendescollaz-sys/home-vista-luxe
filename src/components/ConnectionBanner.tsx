import { useHAStore } from "@/store/useHAStore";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionBanner() {
  const connectionStatus = useHAStore((state) => state.connectionStatus);
  const lastError = useHAStore((state) => state.lastError);

  // Ne rien afficher si connecté
  if (connectionStatus === "connected") return null;

  const isLoading = connectionStatus === "connecting" || connectionStatus === "reconnecting";
  const isError = connectionStatus === "error";

  return (
    <div
      className={cn(
        "fixed bottom-20 left-0 right-0 z-50 mx-4 rounded-lg backdrop-blur-sm transition-all duration-300",
        isError
          ? "bg-destructive/90 text-destructive-foreground border border-destructive"
          : "bg-primary/90 text-primary-foreground border border-primary"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {isError ? (
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
        ) : isLoading ? (
          <div className="relative h-5 w-5 flex-shrink-0">
            <Wifi className="h-5 w-5 animate-pulse" />
          </div>
        ) : (
          <WifiOff className="h-5 w-5 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isError
              ? lastError || "Erreur de connexion"
              : connectionStatus === "connecting"
              ? "Connexion à Home Assistant…"
              : connectionStatus === "reconnecting"
              ? "Reconnexion à Home Assistant…"
              : "Application en pause"}
          </p>
        </div>

        {isLoading && (
          <div className="flex-shrink-0">
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
