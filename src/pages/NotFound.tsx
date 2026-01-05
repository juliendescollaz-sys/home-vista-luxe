import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

/**
 * Page 404 avec auto-redirection pour récupération iOS PWA
 * 
 * Sur iOS PWA, quand l'app revient d'arrière-plan après un certain temps,
 * le router peut perdre la route dynamique (ex: /media-player/:entityId).
 * Cette page détecte ce cas et redirige automatiquement vers l'accueil.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    console.warn("404: Route non trouvée:", location.pathname);
    
    // Auto-redirection vers l'accueil après 3 secondes
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location.pathname, navigate]);

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Page introuvable</h1>
        <p className="mb-6 text-muted-foreground">
          Redirection automatique dans {countdown}s...
        </p>
        <Button onClick={handleGoHome} size="lg">
          <Home className="h-5 w-5 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
