import { ReactNode, useEffect, useState } from "react";

interface SmoothContentProps {
  children: ReactNode;
  /** Délai avant l'apparition en ms (défaut: 100) */
  delay?: number;
  /** Durée de la transition en ms (défaut: 300) */
  duration?: number;
  /** Classe CSS additionnelle */
  className?: string;
}

/**
 * Wrapper qui fait apparaître son contenu en fondu doux
 * Utilisé pour un "smooth start" après le chargement
 */
export function SmoothContent({ 
  children, 
  delay = 100, 
  duration = 300,
  className = "" 
}: SmoothContentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`smooth-content ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
