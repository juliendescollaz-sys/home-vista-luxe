import { persist } from "zustand/middleware";

/**
 * Wrapper sécurisé pour le middleware persist de Zustand.
 * Conserve le typage original de `persist` tout en évitant les crashes liés à localStorage.
 */
export const safePersist: typeof persist = (initializer: any, options: any) => {
  try {
    if (typeof localStorage === "undefined") {
      console.warn(`[persist:${options?.name}] localStorage non disponible, persist désactivé`);
      return initializer;
    }

    const testKey = `__test_${options?.name ?? "persist"}__`;
    try {
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
    } catch {
      console.warn(`[persist:${options?.name}] localStorage inaccessible, persist désactivé`);
      return initializer;
    }

    const userOnRehydrate = options?.onRehydrateStorage;

    return persist(initializer, {
      ...options,
      onRehydrateStorage: (state: any) => {
        // Appel du callback user si présent
        const userAfter = typeof userOnRehydrate === "function" ? userOnRehydrate(state) : undefined;

        return (s: any, error: any) => {
          if (typeof userAfter === "function") {
            try {
              userAfter(s, error);
            } catch {
              // ignore
            }
          }

          if (error) {
            console.error(`[persist:${options?.name}] Erreur d'hydratation:`, error);
            try {
              if (options?.name) localStorage.removeItem(options.name);
            } catch {
              // ignore
            }
          }
        };
      },
    });
  } catch (error) {
    console.error(`[persist:${options?.name}] Erreur fatale:`, error);
    return initializer;
  }
};
