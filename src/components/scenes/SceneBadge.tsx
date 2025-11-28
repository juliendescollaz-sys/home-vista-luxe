import { Sparkles } from "lucide-react";

export const SceneBadge = () => {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-background/70 backdrop-blur-md border-b border-border/30 z-10">
      <Sparkles className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        Scène
      </span>
    </div>
  );
};
