import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RoutineWizardDraft, ROUTINE_ICON_CATEGORIES, ROUTINE_ICON_FRENCH_LABELS } from "@/types/routines";
import * as LucideIcons from "lucide-react";
import { Loader2, Wand2 } from "lucide-react";
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
    if (!draft.name.trim()) {
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

  const handleAcceptSuggestion = () => {
    if (suggestedIcon) {
      onUpdate({ icon: suggestedIcon });
    }
  };

  const handleManualIconSelect = (icon: string) => {
    onUpdate({ icon });
    setIconDialogOpen(false);
  };

  const renderSelectedIcon = () => {
    const IconComponent = (LucideIcons as any)[draft.icon] || LucideIcons.Clock;
    return <IconComponent className="h-12 w-12" />;
  };

  const renderSuggestedIcon = () => {
    if (!suggestedIcon) return null;
    const IconComponent = (LucideIcons as any)[suggestedIcon];
    if (!IconComponent) return null;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
          {renderSelectedIcon()}
        </div>

        <Button variant="outline" onClick={() => setIconDialogOpen(true)}>
          Choisir une icône
        </Button>
      </div>

      {/* AI Suggestion */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Suggestion automatique</span>
        </div>

        {isSuggesting ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyse du nom...
          </div>
        ) : suggestedIcon && suggestedIcon !== draft.icon ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {renderSuggestedIcon()}
              </div>
              <span className="text-sm">{suggestedIcon}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={handleAcceptSuggestion}>
              Utiliser
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {draft.name.trim() ? "Aucune suggestion disponible" : "Entrez un nom pour obtenir une suggestion"}
          </p>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi une icône ?</span> L'icône vous aide à identifier 
          rapidement votre routine dans la liste. Choisissez quelque chose de visuel et mémorable.
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
