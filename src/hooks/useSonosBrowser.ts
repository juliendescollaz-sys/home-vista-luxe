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

    const timeoutId = setTimeout(() => {
      setPage(p => ({ ...p, loading: false, error: "Aucune réponse de Home Assistant (timeout)" }));
      toast.error("Timeout - Home Assistant ne répond pas");
    }, 8000);

    try {
      const result = await client.browseMedia(entityId, mediaContentId, mediaContentType);
      clearTimeout(timeoutId);
      console.log("📦 Résultat HA:", result);
      console.log("📦 Children brut:", result.children);
      
      let items: BrowseNode[] = (result.children || []).map((c: any) => ({
        title: c.title || "Sans titre",
        canPlay: !!c.can_play,
        canExpand: !!c.can_expand,
        mediaContentId: c.media_content_id,
        mediaContentType: c.media_content_type,
        thumbnail: c.thumbnail || c.thumbnail_url,
      }));

      // Filtrage intelligent à la racine uniquement
      const isRoot = !mediaContentId && !mediaContentType;
      if (isRoot) {
        const allowedTitles = ["Favorites", "Radio Browser", "My media"];
        const blockedTypes = ["image", "tts", "camera", "upload"];
        const blockedTitles = ["Camera", "Image Upload", "Text-to-speech", "Upload", "Upload Files", "Local Media"];
        
        items = items.filter(item => {
          // Bloquer par titre
          if (blockedTitles.some(blocked => item.title.toLowerCase().includes(blocked.toLowerCase()))) {
            return false;
          }
          // Bloquer par type de contenu
          if (item.mediaContentType && blockedTypes.some(blocked => item.mediaContentType?.toLowerCase().includes(blocked))) {
            return false;
          }
          // Garder uniquement les sources autorisées
          return allowedTitles.some(allowed => item.title.toLowerCase().includes(allowed.toLowerCase()));
        });
        
        console.log("✨ Items filtrés (racine):", items.length, items.map(i => i.title));
      }

      cache.current.set(cacheKey, items);
      console.log("✅ Items chargés:", items.length, items);
      setPage(p => ({ ...p, items, loading: false, error: undefined }));
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("❌ Erreur browseMedia:", error);
      const rawMsg = error?.message || String(error) || "Contenu indisponible";
      const msg = rawMsg.toLowerCase();

      const isOffline =
        msg.includes("not found") ||
        msg.includes("unavailable") ||
        msg.includes("entity not found");

      const isAuthError =
        msg.includes("auth") ||
        msg.includes("401") ||
        msg.includes("403") ||
        msg.includes("unauthorized") ||
        msg.includes("forbidden");

      let userMessage: string;
      if (isOffline) {
        userMessage = "Ce lecteur Sonos n'est pas disponible pour la navigation de contenu.";
      } else if (isAuthError) {
        userMessage = "Authentification requise pour cette source Sonos (service de streaming ou compte à réautoriser).";
      } else {
        userMessage = rawMsg;
      }

      setPage(p => ({
        ...p,
        loading: false,
        error: userMessage,
      }));

      // Ne pas spammer si juste offline
      if (!isOffline) {
        // Pour une erreur d'auth, message clair
        if (isAuthError) {
          toast.error("Problème d'authentification Sonos : vérifiez votre compte dans Home Assistant ou l'app Sonos.");
        } else {
          toast.error(rawMsg);
        }
      }
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
      console.error("❌ Erreur playMedia:", error);
      const rawMsg = error?.message || String(error) || "Erreur lors de la lecture";
      const msg = rawMsg.toLowerCase();

      const isAuthError =
        msg.includes("auth") ||
        msg.includes("401") ||
        msg.includes("403") ||
        msg.includes("unauthorized") ||
        msg.includes("forbidden");

      if (isAuthError) {
        toast.error("Problème d'authentification Sonos : ouvrez l'app Sonos ou l'intégration Home Assistant pour reconnecter votre compte.");
      } else {
        toast.error("Erreur lors de la lecture");
      }
    }
  }, [client, entityId]);

  const navigateTo = useCallback((node: BrowseNode) => {
    console.log("🔍 navigateTo appelé", node);
    if (!node.canExpand) {
      console.log("❌ Navigation impossible - canExpand est false");
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

    // Passer les valeurs telles quelles, y compris les chaînes vides
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
