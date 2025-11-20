# Structure de Grille Homogène

Ce document décrit le système de grille homogène utilisé dans l'application pour les modes Tablet et Panel.

## Principe

L'application utilise un système de grille unifié défini dans `src/lib/gridLayout.ts` qui garantit une présentation cohérente sur tous les écrans (Mobile, Tablet, Panel).

## Configuration des Colonnes

### Par Type de Contenu

| Type de Contenu | Mobile | Tablet | Panel |
|-----------------|--------|--------|-------|
| **Appareils** (devices) | 1 col | 3 cols | 3 cols |
| **Pièces** (rooms) | 1 col | 2 cols | 3 cols |
| **Étages** (floors) | 1 col | 1 col | 2 cols |
| **Cards** (Scènes, Routines, Groupes, Smart) | 1 col | 3 cols | 3 cols |

### Détection du Mode d'Affichage

Le mode d'affichage est détecté automatiquement via `useDisplayMode()` :
- **Mobile** : < 600px
- **Tablet** : 600px - 1099px
- **Panel** : ≥ 1100px ou `window.NEOLIA_PANEL_MODE === true`

## Utilisation

### Import

```typescript
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";
```

### Dans un Composant

```typescript
const MyComponent = () => {
  const { displayMode } = useDisplayMode();
  
  return (
    <div className={getGridClasses("devices", displayMode)}>
      {/* Contenu */}
    </div>
  );
};
```

### Types de Contenu Disponibles

- **`"devices"`** : Pour les appareils, media players, et entités contrôlables
- **`"rooms"`** : Pour les pièces/zones
- **`"floors"`** : Pour les étages
- **`"cards"`** : Pour les futures fonctionnalités (Scènes, Routines, Groupes, Smart)

## Pages Utilisant le Système

### Implémentées

- ✅ **`src/pages/Rooms.tsx`** : Vue Appareils, Pièces, Étages
- ✅ **`src/pages/Favorites.tsx`** : Liste des favoris
- ✅ **`src/components/FloorSection.tsx`** : Sections d'étages

### À Implémenter

Les futures pages devront utiliser ce système :

- 🔲 **Scènes** : `getGridClasses("cards", displayMode)`
- 🔲 **Routines** : `getGridClasses("cards", displayMode)`
- 🔲 **Groupes** : `getGridClasses("cards", displayMode)`
- 🔲 **Smart** : `getGridClasses("cards", displayMode)`

## Exemples d'Implémentation

### Page Simple avec Grille

```typescript
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const ScenesPage = () => {
  const { displayMode } = useDisplayMode();
  
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-4">
      <div className={getGridClasses("cards", displayMode)}>
        {scenes.map(scene => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>
    </div>
  );
};
```

### Avec Drag & Drop (DndKit)

```typescript
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { DndContext, SortableContext, rectSortingStrategy } from "@dnd-kit/core";

const DevicesPage = () => {
  const { displayMode } = useDisplayMode();
  
  return (
    <DndContext>
      <SortableContext 
        items={devices.map(d => d.id)}
        strategy={rectSortingStrategy}
      >
        <div className={getGridClasses("devices", displayMode)}>
          {devices.map(device => (
            <SortableDeviceCard key={device.id} device={device} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
```

## Personnalisation

Si vous devez modifier les colonnes pour un type de contenu spécifique, éditez `src/lib/gridLayout.ts` :

```typescript
export function getGridColumns(contentType: ContentType, displayMode: DisplayMode): string {
  const layouts: Record<ContentType, Record<DisplayMode, string>> = {
    devices: {
      mobile: "grid-cols-1",
      tablet: "grid-cols-3", // Modifier ici
      panel: "grid-cols-3",  // Modifier ici
    },
    // ...
  };
  
  return layouts[contentType][displayMode];
}
```

## Bonnes Pratiques

1. **Toujours utiliser `getGridClasses()`** au lieu de classes Tailwind en dur
2. **Passer le `displayMode`** du hook `useDisplayMode()`
3. **Choisir le bon type de contenu** selon ce qui est affiché
4. **Utiliser `rectSortingStrategy`** avec DndKit pour les grilles (pas `verticalListSortingStrategy`)
5. **Ajouter `gap-4`** est déjà inclus dans `getGridClasses()`

## Compatibilité

- ✅ Compatible avec `@dnd-kit` (drag & drop)
- ✅ Compatible avec les grilles CSS natives
- ✅ Responsive automatique
- ✅ Support Mobile, Tablet, Panel

## Notes Techniques

- Les classes retournées incluent automatiquement `gap-4` pour l'espacement
- Le système utilise les classes Tailwind natives (`grid-cols-*`)
- Pas de styles inline, tout est géré via Tailwind
- Performance optimale avec tree-shaking Tailwind
