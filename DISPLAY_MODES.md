# Architecture Multi-Dispositifs - Neolia

Cette application utilise une architecture unique qui s'adapte automatiquement selon le type d'appareil.

## Modes d'Affichage

L'application supporte 3 modes d'affichage distincts :

### 📱 MOBILE (smartphone)
- **Seuil** : Viewport < 600px
- **UI** : Navigation en bas (tab bar), écrans empilés, optimisé pour une main
- **Usage** : iPhone, smartphones Android

### 📲 TABLET (tablette classique)
- **Seuil** : 600px ≤ Viewport < 1100px
- **UI** : Layout en 2 colonnes possible, présentation plus riche
- **Usage** : iPad, Galaxy Tab

### 🖥️ PANEL (panneau mural)
- **Seuil** : Viewport ≥ 1100px OU `window.NEOLIA_PANEL_MODE === true`
- **UI** : Dashboard plein écran, gros boutons, contrôle immédiat
- **Usage** : Panneau mural S563 (tablette fixe)

## Architecture Technique

### Détection du Mode

La détection se fait dans `src/hooks/useDisplayMode.ts` selon cette logique :

1. **Flag forcé** : Si `window.NEOLIA_PANEL_MODE === true` → `"panel"`
2. **Largeur viewport** : Calcul basé sur `window.innerWidth`
3. **Futur** : Intégration possible avec `@capacitor/device` pour détecter automatiquement les modèles

```tsx
import { useDisplayMode } from "@/hooks/useDisplayMode";

function MyComponent() {
  const { displayMode } = useDisplayMode();
  // displayMode = "mobile" | "tablet" | "panel"
}
```

### Structure des Dossiers

```
src/
├── ui/
│   ├── mobile/          # Layouts et composants spécifiques mobile
│   │   └── MobileRootLayout.tsx
│   ├── tablet/          # Layouts et composants spécifiques tablet
│   │   └── TabletRootLayout.tsx
│   └── panel/           # Layouts et composants spécifiques panel
│       ├── PanelRootLayout.tsx
│       └── pages/
│           └── PanelHome.tsx
├── pages/               # Pages partagées (réutilisées par mobile/tablet)
├── components/          # Composants partagés
└── hooks/
    └── useDisplayMode.ts
```

### Point d'Entrée (App.tsx)

Le composant `App` route automatiquement vers le bon layout :

```tsx
const { displayMode } = useDisplayMode();

<Route path="/*" element={
  <PrivateRoute>
    {displayMode === "panel" && <PanelRootLayout />}
    {displayMode === "tablet" && <TabletRootLayout />}
    {displayMode === "mobile" && <MobileRootLayout />}
  </PrivateRoute>
} />
```

## Logique Métier Partagée

**IMPORTANT** : La logique fonctionnelle (hooks, services, API) est mutualisée entre les 3 modes.

Les différences se limitent à :
- La présentation visuelle (UI/Layout)
- La navigation (tab bar vs menu latéral vs dashboard)
- L'ergonomie (tailles de boutons, espacement)

Tous les modes utilisent les mêmes :
- Hooks métier (`useHAClient`, `useSonos`, etc.)
- Services d'API
- Store Zustand (`useHAStore`)
- Connexion Home Assistant

## Tests dans Lovable

Pour tester les 3 modes dans le Live Preview :

### Mode MOBILE
1. Sélectionner un device type iPhone dans le sélecteur d'appareil
2. Ou redimensionner le viewport à < 600px

### Mode TABLET
1. Sélectionner un device type iPad dans le sélecteur d'appareil
2. Ou redimensionner le viewport entre 600-1100px

### Mode PANEL
1. Élargir le viewport à > 1100px
2. Ou définir `window.NEOLIA_PANEL_MODE = true` dans la console

## Forcer le Mode Panel (Build APK S563)

Pour créer un build spécifique pour le panneau S563 :

### Option 1 : Flag Global (Recommandé)

Dans `index.html`, avant le chargement de l'app :

```html
<script>
  window.NEOLIA_PANEL_MODE = true;
</script>
```

### Option 2 : Variable d'Environnement

Dans `.env` :
```
VITE_PANEL_MODE=true
```

Puis modifier `useDisplayMode.ts` pour lire cette variable.

## Ajout d'une Nouvelle UI Spécifique

### Ajouter un écran spécifique au mode Panel

1. Créer le composant dans `src/ui/panel/pages/`
2. Ajouter la route dans `PanelRootLayout.tsx`
3. La logique métier reste dans les hooks partagés

### Créer un composant avec variantes par mode

```tsx
// src/components/DeviceCard.tsx
import { useDisplayMode } from "@/hooks/useDisplayMode";

export function DeviceCard({ device }) {
  const { displayMode } = useDisplayMode();

  if (displayMode === "panel") {
    return <PanelDeviceCard device={device} />;
  }

  return <StandardDeviceCard device={device} />;
}
```

## Bonnes Pratiques

### ✅ À FAIRE
- Réutiliser les hooks métier existants
- Créer des variantes UI distinctes pour panel si nécessaire
- Tester les 3 modes régulièrement
- Documenter les comportements spécifiques par mode

### ❌ À ÉVITER
- Dupliquer la logique fonctionnelle
- Hardcoder des conditions sur le mode dans la logique métier
- Créer des hooks différents par mode (sauf cas très spécifique)
- Oublier de tester le mode panel

## Roadmap

### Phase 1 (Actuel)
- ✅ Système de détection de mode
- ✅ Structure de base pour les 3 modes
- ✅ Mobile : UI complète et fonctionnelle
- ⚠️ Tablet : Réutilise le mobile (à optimiser)
- ⚠️ Panel : Dashboard de base (à développer)

### Phase 2 (À venir)
- [ ] Tablet : Layout split-view (liste + détail)
- [ ] Panel : Dashboard complet avec contrôles directs
- [ ] Panel : Interphone intégré
- [ ] Panel : Protection PIN pour settings

### Phase 3 (Future)
- [ ] Intégration Capacitor Device.getInfo
- [ ] Détection automatique des modèles (iPad, S563)
- [ ] Analytics par mode d'affichage
- [ ] Mode "kiosque" pour panel

## Support

Pour toute question sur l'architecture multi-dispositifs :
1. Consulter ce document
2. Vérifier `src/hooks/useDisplayMode.ts`
3. Examiner les layouts dans `src/ui/{mode}/`
