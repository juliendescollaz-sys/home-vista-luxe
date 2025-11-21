import { ReactNode } from "react";

interface NeoliaCanvasWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper réutilisable pour les vues principales tablette.
 * Force un aspect-ratio 4:3 (ratio iPad) avec centrage sur écrans 16:10.
 * 
 * Usage: envelopper le contenu principal des pages tablette
 */
export const NeoliaCanvasWrapper = ({ children, className = "" }: NeoliaCanvasWrapperProps) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div
        className={`
          relative
          rounded-3xl
          overflow-hidden
          shadow-elegant
          max-w-full
          max-h-full
          ${className}
        `}
        style={{
          aspectRatio: "4 / 3",
        }}
      >
        {children}
      </div>
    </div>
  );
};
