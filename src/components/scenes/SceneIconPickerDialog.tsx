import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SCENE_ICON_CATEGORIES, ICON_FRENCH_LABELS } from "@/types/scenes";
import { Search, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SceneIconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

export function SceneIconPickerDialog({
  open,
  onOpenChange,
  selectedIcon,
  onSelectIcon,
}: SceneIconPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [tempSelection, setTempSelection] = useState(selectedIcon);

  // Reset temp selection when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempSelection(selectedIcon);
      setSearch("");
    }
    onOpenChange(isOpen);
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) {
      return SCENE_ICON_CATEGORIES;
    }

    const searchLower = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const result: Record<string, { label: string; icons: readonly string[] }> = {};

    for (const [key, category] of Object.entries(SCENE_ICON_CATEGORIES)) {
      const matchingIcons = category.icons.filter((icon) => {
        // Check French labels first
        const frenchLabels = ICON_FRENCH_LABELS[icon] || [];
        const matchesFrench = frenchLabels.some(label => 
          label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchLower)
        );
        // Fallback to English icon name
        const matchesEnglish = icon.toLowerCase().includes(searchLower);
        return matchesFrench || matchesEnglish;
      });
      if (matchingIcons.length > 0) {
        result[key] = { label: category.label, icons: matchingIcons };
      }
    }

    return result;
  }, [search]);

  const renderIcon = (iconName: string, size: string = "w-5 h-5") => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className={size} />;
  };

  const handleValidate = () => {
    onSelectIcon(tempSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choisir une icône</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une icône..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {Object.entries(filteredCategories).map(([key, category]) => (
              <div key={key}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {category.label}
                </h4>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {category.icons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setTempSelection(iconName)}
                      className={cn(
                        "flex items-center justify-center p-2.5 rounded-lg transition-all",
                        "hover:bg-accent hover:text-accent-foreground",
                        tempSelection === iconName
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "bg-muted/50"
                      )}
                      title={iconName}
                    >
                      {renderIcon(iconName)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucune icône trouvée pour "{search}"
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleValidate} className="gap-2">
            <Check className="w-4 h-4" />
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
