import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Rooms = () => {
  const { displayMode } = useDisplayMode();
  const rootClassName = displayMode === "mobile" ? "min-h-screen bg-background pb-20" : "min-h-screen bg-background";
  const contentPaddingTop = displayMode === "mobile" ? "pt-[138px]" : "pt-[26px]";

  return (
    <div className={rootClassName}>
      <TopBar title="Maison" />
      <div className={`max-w-screen-xl mx-auto px-4 pb-4 ${contentPaddingTop}`}>
        {/* Page vierge */}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
