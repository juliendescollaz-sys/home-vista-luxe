import { useEffect } from "react";
import { useSonosBrowser, BrowseNode } from "@/hooks/useSonosBrowser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ChevronRight, Play, Folder, Radio, Disc3, ListMusic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HAClient } from "@/lib/haClient";

interface SonosBrowserProps {
  client: HAClient | null;
  entityId: string;
  connectionUrl?: string;
}

export function SonosBrowser({ client, entityId, connectionUrl }: SonosBrowserProps) {
  const { page, loadRoot, navigateTo, navigateBack, playMedia } = useSonosBrowser(client, entityId);

  useEffect(() => {
    if (client && page.items.length === 0 && !page.loading && page.path.length === 1) {
      console.log("🚀 Chargement initial de la racine");
      loadRoot();
    }
  }, [client, loadRoot, page.items.length, page.loading, page.path.length]);

  const getIconForNode = (node: BrowseNode) => {
    if (node.canPlay && !node.canExpand) return Play;
    if (node.title.toLowerCase().includes("playlist")) return ListMusic;
    if (node.title.toLowerCase().includes("album")) return Disc3;
    if (node.title.toLowerCase().includes("radio")) return Radio;
    if (node.canExpand) return Folder;
    return Music;
  };

  const getThumbnailUrl = (thumbnail?: string) => {
    if (!thumbnail) return null;
    if (thumbnail.startsWith("http")) return thumbnail;
    if (connectionUrl) return `${connectionUrl}${thumbnail}`;
    return null;
  };

  const handleNodeClick = (node: BrowseNode) => {
    console.log("👆 Click sur node", node);
    if (node.canExpand) {
      console.log("📂 Navigation vers dossier");
      navigateTo(node);
    } else if (node.canPlay) {
      console.log("▶️ Lecture");
      playMedia(node);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header compact */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h3 className="text-base font-semibold">Bibliothèque</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadRoot}
          disabled={page.loading}
          className="h-8 text-xs"
        >
          Actualiser
        </Button>
      </div>

      {/* Fil d'Ariane compact */}
      {page.path.length > 1 && (
        <div className="px-4 py-2 bg-accent/30 border-b overflow-x-auto">
          <div className="flex items-center gap-1 text-xs whitespace-nowrap">
            {page.path.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <button
                  onClick={() => navigateBack(index)}
                  className={cn(
                    "hover:text-primary transition-colors",
                    index === page.path.length - 1 
                      ? "text-foreground font-medium" 
                      : "text-muted-foreground"
                  )}
                  disabled={page.loading}
                >
                  {item.title}
                </button>
                {index < page.path.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="p-2">
        {page.loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {page.error && (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-destructive mb-3">{page.error}</p>
            <Button variant="outline" size="sm" onClick={loadRoot}>
              Réessayer
            </Button>
          </div>
        )}

        {!page.loading && !page.error && page.items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Aucun contenu</p>
          </div>
        )}

        {!page.loading && !page.error && page.items.length > 0 && (
          <div className="space-y-1 max-h-[350px] overflow-y-auto">
            {page.items.map((node, index) => {
              const Icon = getIconForNode(node);
              const thumbnailUrl = getThumbnailUrl(node.thumbnail);

              return (
                <button
                  key={`${node.title}-${index}`}
                  onClick={() => handleNodeClick(node)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg",
                    "hover:bg-accent active:bg-accent/70 transition-all",
                    "border border-transparent hover:border-border",
                    "group text-left"
                  )}
                >
                  {/* Thumbnail compact */}
                  <div className="flex-shrink-0 w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={node.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            const iconDiv = document.createElement('div');
                            iconDiv.className = 'w-full h-full flex items-center justify-center';
                            parent.appendChild(iconDiv);
                          }
                        }}
                      />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Contenu texte */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1 mb-0.5">
                      {node.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {node.canPlay && (
                        <span className="flex items-center gap-0.5">
                          <Play className="h-3 w-3" />
                          Lecture
                        </span>
                      )}
                      {node.canExpand && (
                        <span className="flex items-center gap-0.5">
                          <Folder className="h-3 w-3" />
                          Dossier
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicateur de navigation */}
                  {node.canExpand && (
                    <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                  {node.canPlay && !node.canExpand && (
                    <Play className="flex-shrink-0 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
