import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QrCode, Mail } from "lucide-react";
import neoliaLogo from "@/assets/neolia-logo.png";

const Onboarding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-12 animate-fade-up">
        {/* Logo Neolia */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <img 
              src={neoliaLogo} 
              alt="Neolia" 
              className="h-24 w-auto"
            />
          </div>
          <p className="text-muted-foreground text-xl">Smart Home Premium</p>
        </div>

        {/* Bouton Scanner QR */}
        <Button
          onClick={() => navigate("/onboarding/scan")}
          size="lg"
          className="w-full h-14 text-lg font-semibold"
        >
          <QrCode className="mr-3 h-6 w-6" />
          Scanner un code QR
        </Button>

        {/* Lien de contact */}
        <div className="text-center pt-8">
          <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
          <a
            href="mailto:contact@neolia.ch"
            className="inline-flex items-center gap-2 text-primary hover:underline text-base font-medium"
          >
            <Mail className="h-4 w-4" />
            contact@neolia.ch
          </a>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
