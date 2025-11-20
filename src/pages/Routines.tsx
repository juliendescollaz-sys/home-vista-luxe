import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Routines = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-[7.125rem]" : "pt-10";
  
  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Routines" />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <p className="text-muted-foreground">Vos routines automatiques apparaîtront ici...</p>
      </div>
    </div>
  );
};

export default Routines;
