import { useState, useMemo } from "react";
import { SmartWizardDraft, SMART_ICON_CATEGORIES, SMART_ICON_FRENCH_LABELS } from "@/types/smart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SmartIconStepProps {
  draft: SmartWizardDraft;
  onUpdate: (updates: Partial<SmartWizardDraft>) => void;
}

export function SmartIconStep({ draft, onUpdate }: SmartIconStepProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return SMART_ICON_CATEGORIES;

    const term = searchTerm.toLowerCase().trim();
    const result: Record<string, { label: string; icons: string[] }> = {};

    Object.entries(SMART_ICON_CATEGORIES).forEach(([key, category]) => {
      const filteredIcons = category.icons.filter((iconName) => {
        // Match icon name
        if (iconName.toLowerCase().includes(term)) return true;
        // Match French labels
        const frenchLabels = SMART_ICON_FRENCH_LABELS[iconName] || [];
        return frenchLabels.some((label) => label.toLowerCase().includes(term));
      });

      if (filteredIcons.length > 0) {
        result[key] = { label: category.label, icons: filteredIcons };
      }
    });

    return result;
  }, [searchTerm]);

  const handleIconSelect = (iconName: string) => {
    onUpdate({ icon: iconName });
  };

  const SelectedIcon = (LucideIcons as any)[draft.icon] || LucideIcons.Bot;

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
          <SelectedIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="font-medium">{draft.name || "Nouvelle automatisation"}</p>
          <p className="text-sm text-muted-foreground">Icône sélectionnée : {draft.icon}</p>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="icon-search">Rechercher une icône</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="icon-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ex: soleil, température, présence..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Icon grid by category */}
      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
        {Object.entries(filteredCategories).map(([key, category]) => (
          <div key={key} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{category.label}</p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {category.icons.map((iconName) => {
                const IconComp = (LucideIcons as any)[iconName];
                if (!IconComp) return null;
                
                const isSelected = draft.icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handleIconSelect(iconName)}
                    className={cn(
                      "p-3 rounded-lg border transition-all flex items-center justify-center",
                      isSelected
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-background border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={iconName}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(filteredCategories).length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucune icône trouvée pour "{searchTerm}"
          </p>
        )}
      </div>
    </div>
  );
}
