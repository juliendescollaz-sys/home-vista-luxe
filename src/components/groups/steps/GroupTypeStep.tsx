import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers } from "lucide-react";
import type { GroupDomainConfig } from "@/lib/groupDomains";

interface GroupTypeStepProps {
  isMixedMode: boolean;
  selectedDomains: string[];
  availableDomains: GroupDomainConfig[];
  binaryDomains: GroupDomainConfig[];
  mixedModeError: string | null;
  onMixedModeChange: (enabled: boolean) => void;
  onDomainSelect: (domain: string) => void;
}

export function GroupTypeStep({
  isMixedMode,
  selectedDomains,
  availableDomains,
  binaryDomains,
  mixedModeError,
  onMixedModeChange,
  onDomainSelect,
}: GroupTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Groupe mixte (binaires)</p>
              <p className="text-sm text-muted-foreground">Combiner éclairages, interrupteurs, vannes...</p>
            </div>
          </div>
          <Switch checked={isMixedMode} onCheckedChange={onMixedModeChange} />
        </div>

        <div className="space-y-2">
          <Label>{isMixedMode ? "Types d'appareils (multi-sélection)" : "Type d'appareil"}</Label>
          
          {isMixedMode ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {binaryDomains.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer ${selectedDomains.includes(opt.value) ? "bg-primary/10 border-primary/50" : ""}`}
                >
                  <Checkbox
                    checked={selectedDomains.includes(opt.value)}
                    onCheckedChange={() => onDomainSelect(opt.value)}
                  />
                  <opt.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <Select value={selectedDomains[0] || ""} onValueChange={(v) => onDomainSelect(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {availableDomains.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {mixedModeError && <p className="text-sm text-destructive">{mixedModeError}</p>}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi choisir un type ?</span> Un groupe contrôle plusieurs appareils 
          ensemble. Sélectionnez le type d'appareils que vous souhaitez regrouper, ou activez le mode mixte 
          pour combiner différents types binaires.
        </p>
      </div>
    </div>
  );
}
