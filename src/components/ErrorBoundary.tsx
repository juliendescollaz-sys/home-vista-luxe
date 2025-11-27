import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log détaillé pour debugging
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    
    // Sauvegarder le stack pour affichage
    this.setState({ componentStack: errorInfo.componentStack || undefined });
    
    // Tentative de décoder l'erreur minifiée React
    if (error.message.includes("#310")) {
      console.error("🔴 React Error #310: Rendered more hooks than during the previous render");
      console.error("Cela signifie qu'un composant a appelé plus de hooks lors du dernier render.");
    }
  }

  render() {
    if (this.state.hasError) {
      // Décoder l'erreur React #310 si présente
      const isHooksError = this.state.error?.message.includes("#310");
      const decodedMessage = isHooksError 
        ? "Rendered more hooks than during the previous render. Un composant a changé le nombre de hooks entre deux renders."
        : this.state.error?.message;
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background overflow-auto">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-8 w-8 flex-shrink-0" />
              <h1 className="text-xl font-bold">Une erreur s'est produite</h1>
            </div>
            
            <p className="text-muted-foreground text-sm">
              L'application a rencontré une erreur inattendue.
            </p>
            
            {this.state.error && (
              <div className="p-3 bg-muted rounded-lg space-y-2 max-h-[200px] overflow-auto">
                <p className="text-sm font-mono text-destructive break-words">
                  {decodedMessage}
                </p>
                {isHooksError && (
                  <p className="text-xs text-muted-foreground">
                    Erreur React #310 détectée. Vérifiez les hooks conditionnels.
                  </p>
                )}
              </div>
            )}
            
            {this.state.componentStack && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Voir le stack du composant
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto max-h-[150px] whitespace-pre-wrap">
                  {this.state.componentStack}
                </pre>
              </details>
            )}
            
            <div className="space-y-2">
              <Button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="w-full"
              >
                Réinitialiser l'application
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Rafraîchir la page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
