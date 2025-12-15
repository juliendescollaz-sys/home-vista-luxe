import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RoutineWizardDraft, ROUTINE_ICON_FRENCH_LABELS } from "@/types/routines";
import * as LucideIcons from "lucide-react";
import { Pencil, Sparkles, Loader2 } from "lucide-react";
import { RoutineIconPickerDialog } from "../RoutineIconPickerDialog";
import { supabase } from "@/integrations/supabase/client";

interface RoutineIconStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
}

export function RoutineIconStep({ draft, onUpdate }: RoutineIconStepProps) {
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [suggestedIcon, setSuggestedIcon] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // AI icon suggestion based on routine name
  useEffect(() => {
    if (!draft.name.trim() || draft.name.trim().length < 3) {
      setSuggestedIcon(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const { data, error } = await supabase.functions.invoke("suggest-scene-icon", {
          body: { 
            sceneName: draft.name,
            availableIcons: Object.keys(ROUTINE_ICON_FRENCH_LABELS)
          },
        });

        if (!error && data?.icon) {
          setSuggestedIcon(data.icon);
        }
      } catch (e) {
        console.error("[RoutineIconStep] AI suggestion error:", e);
      } finally {
        setIsSuggesting(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [draft.name]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestedIcon) {
      onUpdate({ icon: suggestedIcon });
      setSuggestedIcon(null);
    }
  }, [suggestedIcon, onUpdate]);

  const handleManualIconSelect = useCallback(
    (icon: string) => {
      onUpdate({ icon });
      setSuggestedIcon(null);
    },
    [onUpdate]
  );

  const renderSelectedIcon = () => {
    const IconComponent = (LucideIcons as any)[draft.icon];
    if (!IconComponent) {
      const FallbackIcon = (LucideIcons as any).Clock;
      return <FallbackIcon className="w-12 h-12" />;
    }
    return <IconComponent className="w-12 h-12" />;
  };

  const renderSuggestedIcon = () => {
    if (!suggestedIcon) return null;
    const IconComponent = (LucideIcons as any)[suggestedIcon];
    if (!IconComponent) return null;
    return <IconComponent className="w-8 h-8" />;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Icône de la routine</Label>

        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border-2 border-primary/20">
            {renderSelectedIcon()}
          </div>

          <Button type="button" variant="outline" onClick={() => setIconDialogOpen(true)} className="gap-2">
            <Pencil className="w-4 h-4" />
            Choisir une icône
          </Button>
        </div>

        {/* AI Suggestion */}
        {isSuggesting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Suggestion IA en cours...
          </div>
        )}

        {suggestedIcon && !isSuggesting && (
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAcceptSuggestion}
              className="gap-2 text-primary hover:text-primary border-primary/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Utiliser la suggestion :</span>
              <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {renderSuggestedIcon()}
              </span>
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi une icône ?</span> L'icône permet d'identifier visuellement 
          votre routine d'un coup d'œil. L'IA peut vous suggérer une icône adaptée au nom de votre routine.
        </p>
      </div>

      <RoutineIconPickerDialog
        open={iconDialogOpen}
        onOpenChange={setIconDialogOpen}
        selectedIcon={draft.icon}
        onSelectIcon={handleManualIconSelect}
      />
    </div>
  );
}
