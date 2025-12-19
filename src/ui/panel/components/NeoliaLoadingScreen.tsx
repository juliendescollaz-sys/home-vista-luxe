import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";
import { Loader2 } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
};

export function NeoliaLoadingScreen({ title, subtitle }: Props) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background animate-in fade-in duration-200">
      <div className="w-full max-w-lg px-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-44 w-44">
            {/* halo */}
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl animate-pulse" />
            {/* anneaux */}
            <div className="absolute inset-4 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-2 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" />
            {/* orbite */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "1600ms" }}>
              <div className="absolute left-1/2 top-0 -translate-x-1/2 h-3 w-3 rounded-full bg-primary" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary/70" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary/70" />
            </div>

            {/* logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-card shadow-lg border">
                <img
                  src={neoliaLogoDark}
                  alt="Neolia"
                  className="h-10 w-auto max-w-[140px] object-contain dark:hidden"
                />
                <img
                  src={neoliaLogo}
                  alt="Neolia"
                  className="h-10 w-auto max-w-[140px] object-contain hidden dark:block"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <div className="text-2xl font-semibold">{title}</div>
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </div>

          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Veuillez patienter…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
