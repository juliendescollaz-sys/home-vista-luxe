import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

interface TopBarPanelProps {
  title: string;
}

/**
 * TopBar optimisee pour panel 8" (1280x800) - lisible a 1m de distance
 * - Hauteur augmentee (h-16 = 64px)
 * - Logo plus grand (h-10 = 40px)
 * - Titre en 3xl (30px) pour lisibilite
 */
export function TopBarPanel({ title }: TopBarPanelProps) {
  const { theme } = useTheme();

  return (
    <header className="h-16 flex items-center border-b border-border/30 px-6 glass-nav shrink-0">
      <img
        src={theme === "light" ? neoliaLogoDark : neoliaLogoLight}
        alt="Neolia"
        className="h-10 w-auto"
      />

      <h1 className="flex-1 text-center text-3xl font-bold -ml-10">
        {title}
      </h1>
    </header>
  );
}

export default TopBarPanel;
