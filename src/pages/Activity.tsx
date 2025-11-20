import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Activity = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-16" : "pt-10";
  
  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <h2 className="text-3xl font-bold mb-4">Activité</h2>
        <p className="text-muted-foreground">Journal des événements récents à venir...</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Activity;
