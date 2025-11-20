import { Package } from "lucide-react";

export const GroupBadge = () => {
  return (
    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-background/70 backdrop-blur-md border-b border-border/30">
      <Package className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        Groupe
      </span>
    </div>
  );
};
