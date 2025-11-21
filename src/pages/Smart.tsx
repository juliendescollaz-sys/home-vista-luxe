import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Smart = () => {
  const { displayMode } = useDisplayMode();
  
  return (
    <div className="w-full h-full bg-background">
      {displayMode === "mobile" && <TopBar title="Smarthome" />}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <p className="text-muted-foreground">Fonctionnalités intelligentes à venir...</p>
      </div>
      {displayMode === "mobile" && <BottomNav />}
    </div>
  );
};

export default Smart;
