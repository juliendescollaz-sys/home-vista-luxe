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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Une erreur s'est produite</h1>
            </div>
            
            <p className="text-muted-foreground">
              L'application a rencontré une erreur inattendue.
            </p>
            
            {this.state.error && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Button
                onClick={() => {
                  // Clear storage and reload
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
