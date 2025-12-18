import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Composant qui ajoute une transition de fondu lors des changements de page
 * et un délai pour un démarrage fluide après le spinner
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayedChildren, setDisplayedChildren] = useState(children);

  // Effet de fondu à l'entrée initiale
  useEffect(() => {
    // Petit délai pour que le DOM soit prêt
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Effet de transition lors du changement de route
  useEffect(() => {
    // Fade out
    setIsVisible(false);

    const timer = setTimeout(() => {
      setDisplayedChildren(children);
      // Fade in
      setIsVisible(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Mettre à jour les enfants sans transition si c'est juste un re-render
  useEffect(() => {
    setDisplayedChildren(children);
  }, [children]);

  return (
    <div
      className={`page-transition ${isVisible ? "page-visible" : "page-hidden"}`}
    >
      {displayedChildren}
    </div>
  );
}
