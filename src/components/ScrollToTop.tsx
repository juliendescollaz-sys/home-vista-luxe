import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset window scroll
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // Find and reset the closest scrollable parent container
    if (elementRef.current) {
      let parent = elementRef.current.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const isScrollable = 
          style.overflowY === "auto" || 
          style.overflowY === "scroll" ||
          style.overflow === "auto" ||
          style.overflow === "scroll";
        
        if (isScrollable) {
          parent.scrollTop = 0;
          parent.scrollLeft = 0;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, [pathname]);

  // Render an invisible element to find the scrollable parent
  return <div ref={elementRef} style={{ display: "none" }} />;
};
