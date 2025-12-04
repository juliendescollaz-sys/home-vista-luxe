import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

interface TopBarPanelProps {
  title: string;
}

export function TopBarPanel({ title }: TopBarPanelProps) {
  const { theme } = useTheme();

  return (
    <header className="h-14 flex items-center border-b border-border/30 px-4 glass-nav shrink-0">
      <img
        src={theme === "light" ? neoliaLogoDark : neoliaLogoLight}
        alt="Neolia"
        className="h-8 w-auto"
      />

      <h1 className="flex-1 text-center text-2xl font-bold -ml-8">
        {title}
      </h1>
    </header>
  );
}

export default TopBarPanel;
