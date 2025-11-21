import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Routines = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-10";
  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full h-full flex items-center justify-center";
  
  return (
    <div className={rootClassName}>
      <TopBar title="Routines" />
      <div className="max-w-screen-xl mx-auto px-6 py-6 text-center">
        <p className="text-muted-foreground">Vos routines automatiques apparaîtront ici...</p>
      </div>
    </div>
  );
};

export default Routines;
