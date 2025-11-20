import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Groupes = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-10";
  
  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Groupes" />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <p className="text-muted-foreground">Vos groupes d'appareils apparaîtront ici...</p>
      </div>
    </div>
  );
};

export default Groupes;
