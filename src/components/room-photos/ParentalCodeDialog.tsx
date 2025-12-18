/**
 * Dialog for entering parental code to unlock a room photo
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface ParentalCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<boolean>;
  roomName?: string;
}

export const ParentalCodeDialog = ({
  open,
  onClose,
  onConfirm,
  roomName,
}: ParentalCodeDialogProps) => {
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = async () => {
    if (code.length < 4) {
      setError("Veuillez entrer au moins 4 chiffres");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const isValid = await onConfirm(code);
      if (!isValid) {
        setError("Code incorrect");
      }
      // Dialog will be closed by parent if valid
    } catch (e) {
      setError("Erreur de vérification");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setCode(digits);
    setError("");
  };

  const handleClose = () => {
    setCode("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>Photo protégée</DialogTitle>
          </div>
          <DialogDescription>
            {roomName
              ? `Entrez le code parental pour modifier la photo de "${roomName}".`
              : "Entrez le code parental pour modifier cette photo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-code">Code parental</Label>
            <div className="relative">
              <Input
                id="unlock-code"
                type={showCode ? "text" : "password"}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="••••"
                maxLength={8}
                disabled={isVerifying}
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length >= 4) {
                    handleConfirm();
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isVerifying || code.length < 4}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              "Déverrouiller"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
