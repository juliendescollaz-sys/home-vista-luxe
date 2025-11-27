import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SCENE_ICON_CATEGORIES, ALL_SCENE_ICONS } from "@/types/scenes";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SceneIconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

export function SceneIconPicker({ selectedIcon, onSelectIcon }: SceneIconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) {
      return SCENE_ICON_CATEGORIES;
    }

    const searchLower = search.toLowerCase();
    const result: Record<string, { label: string; icons: string[] }> = {};

    for (const [key, category] of Object.entries(SCENE_ICON_CATEGORIES)) {
      const matchingIcons = category.icons.filter((icon) =>
        icon.toLowerCase().includes(searchLower)
      );
      if (matchingIcons.length > 0) {
        result[key] = { label: category.label, icons: matchingIcons };
      }
    }

    return result;
  }, [search]);

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une icône..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-4">
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
                  onClick={() => onSelectIcon(iconName)}
                  className={cn(
                    "flex items-center justify-center p-2.5 rounded-lg transition-all",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedIcon === iconName
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
  );
}
