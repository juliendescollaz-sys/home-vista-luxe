import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { HAClient } from "@/lib/haClient";

export type BrowseNode = {
  title: string;
  canPlay: boolean;
  canExpand: boolean;
  mediaContentId?: string;
  mediaContentType?: string;
  thumbnail?: string;
};

export type BreadcrumbItem = {
  title: string;
  mediaContentId?: string;
  mediaContentType?: string;
};

type BrowsePage = {
  path: BreadcrumbItem[];
  items: BrowseNode[];
  loading: boolean;
  error?: string;
};

export function useSonosBrowser(client: HAClient | null, entityId: string) {
  const cache = useRef(new Map<string, BrowseNode[]>());
  
  const [page, setPage] = useState<BrowsePage>({
    path: [{ title: "Sonos" }],
    items: [],
    loading: false,
    error: undefined,
  });

  const getCacheKey = useCallback((id?: string, type?: string) => {
    return `${entityId}::${id || "ROOT"}::${type || "ROOT"}`;
  }, [entityId]);

  const browseMedia = useCallback(async (mediaContentId?: string, mediaContentType?: string) => {
    console.log("🎵 browseMedia appelé", { entityId, mediaContentId, mediaContentType, clientConnected: !!client });
    
    if (!client) {
      console.error("❌ Client non connecté");
      toast.error("Non connecté à Home Assistant");
      return;
    }

    const cacheKey = getCacheKey(mediaContentId, mediaContentType);
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      console.log("✅ Données en cache", cached);
      setPage(p => ({ ...p, items: cached, loading: false, error: undefined }));
      return;
    }

    console.log("⏳ Chargement depuis HA...");
    setPage(p => ({ ...p, loading: true, error: undefined }));

    try {
      const result = await client.browseMedia(entityId, mediaContentId, mediaContentType);
      console.log("📦 Résultat HA:", result);
      console.log("📦 Children brut:", result.children);
      
      const items: BrowseNode[] = (result.children || []).map((c: any) => {
        console.log("🔍 Child brut:", c);
        return {
          title: c.title || "Sans titre",
          canPlay: !!c.can_play,
          canExpand: !!c.can_expand,
          mediaContentId: c.media_content_id,
          mediaContentType: c.media_content_type,
          thumbnail: c.thumbnail || c.thumbnail_url,
        };
      });

      cache.current.set(cacheKey, items);
      console.log("✅ Items chargés:", items.length, items);
      setPage(p => ({ ...p, items, loading: false, error: undefined }));
    } catch (error: any) {
      const errorMsg = error.message || "Contenu indisponible";
      setPage(p => ({ ...p, loading: false, error: errorMsg }));
      toast.error(errorMsg);
    }
  }, [client, entityId, getCacheKey]);

  const playMedia = useCallback(async (node: BrowseNode) => {
    if (!node.canPlay || !node.mediaContentId || !node.mediaContentType || !client) {
      toast.error("Cet élément ne peut pas être lu");
      return;
    }

    try {
      await client.playMedia(entityId, node.mediaContentId, node.mediaContentType);
      toast.success("Lecture lancée");
    } catch (error: any) {
      toast.error("Erreur lors de la lecture");
    }
  }, [client, entityId]);

  const navigateTo = useCallback((node: BrowseNode) => {
    console.log("🔍 navigateTo appelé", node);
    if (!node.canExpand || !node.mediaContentId || !node.mediaContentType) {
      console.log("❌ Navigation impossible", { canExpand: node.canExpand, hasIds: !!(node.mediaContentId && node.mediaContentType) });
      return;
    }

    setPage(p => ({
      ...p,
      path: [
        ...p.path,
        {
          title: node.title,
          mediaContentId: node.mediaContentId,
          mediaContentType: node.mediaContentType,
        },
      ],
    }));

    browseMedia(node.mediaContentId, node.mediaContentType);
  }, [browseMedia]);

  const navigateBack = useCallback((index: number) => {
    const targetPath = page.path.slice(0, index + 1);
    setPage(p => ({ ...p, path: targetPath }));

    const target = targetPath[targetPath.length - 1];
    browseMedia(target.mediaContentId, target.mediaContentType);
  }, [page.path, browseMedia]);

  const loadRoot = useCallback(() => {
    setPage({
      path: [{ title: "Sonos" }],
      items: [],
      loading: false,
      error: undefined,
    });
    browseMedia();
  }, [browseMedia]);

  return {
    page,
    loadRoot,
    navigateTo,
    navigateBack,
    playMedia,
  };
}
