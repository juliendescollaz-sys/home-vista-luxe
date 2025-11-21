# 🏠 Système Universel de Gestion des Entités Home Assistant

Ce document décrit l'architecture et l'utilisation du système universel de gestion des entités Neolia.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Composants disponibles](#composants-disponibles)
4. [Utilisation](#utilisation)
5. [Ajout de nouveaux types](#ajout-de-nouveaux-types)

## 🎯 Vue d'ensemble

Le système universel permet de gérer **automatiquement** tous les types d'entités Home Assistant sans modification du code. Il détecte le type d'entité et affiche le composant UI approprié.

### Fonctionnalités principales

- ✅ Détection automatique du type d'entité
- ✅ Support de tous les domaines Home Assistant
- ✅ Composants spécialisés par type d'appareil
- ✅ Gestion OTA firmware (Z-Wave)
- ✅ Capteurs et alertes
- ✅ Future-proof et extensible

## 🏗️ Architecture

### Fichiers principaux

```
src/
├── lib/
│   └── entityUtils.ts                    # Utilitaires de détection
├── components/
│   └── entities/
│       ├── UniversalEntityTile.tsx       # Composant universel (routeur)
│       ├── LightTile.tsx                 # Éclairages
│       ├── CoverTile.tsx                 # Volets/stores
│       ├── ClimateTile.tsx               # Chauffage/clim
│       ├── FanTile.tsx                   # Ventilateurs
│       ├── LockTile.tsx                  # Serrures
│       ├── ValveTile.tsx                 # Vannes
│       ├── SensorTile.tsx                # Capteurs
│       ├── AlertTile.tsx                 # Alertes sécurité
│       └── UpdateTile.tsx                # Mises à jour firmware
```

### Flux de détection

```
HAEntity → getBestWidgetForEntity() → UniversalEntityTile → Composant spécialisé
```

## 🧩 Composants disponibles

### 1. **LightTile** - Éclairages

Supporte :
- ✅ ON/OFF
- ✅ Variation (brightness)
- ✅ Température couleur
- ✅ RGB/RGBW/RGBWW
- ✅ Effets

```tsx
<LightTile entity={entity} onControl={handleControl} />
```

### 2. **CoverTile** - Volets & Stores

Supporte :
- ✅ Open/Close/Stop
- ✅ Position (0-100%)
- ✅ Tilt (stores vénitiens)
- ✅ États en temps réel

```tsx
<CoverTile entity={entity} onControl={handleControl} />
```

### 3. **ClimateTile** - Chauffage/Climatisation

Supporte :
- ✅ Modes (heat/cool/auto/dry/fan)
- ✅ Température cible
- ✅ Température actuelle
- ✅ Modes de ventilation

```tsx
<ClimateTile entity={entity} onControl={handleControl} />
```

### 4. **FanTile** - Ventilateurs

Supporte :
- ✅ ON/OFF
- ✅ Vitesse (0-100%)
- ✅ Modes prédéfinis
- ✅ Animation rotation

```tsx
<FanTile entity={entity} onControl={handleControl} />
```

### 5. **LockTile** - Serrures

Supporte :
- ✅ Lock/Unlock
- ✅ État batterie
- ✅ Alertes batterie faible
- ✅ État sécurisé

```tsx
<LockTile entity={entity} onControl={handleControl} />
```

### 6. **ValveTile** - Vannes

Supporte :
- ✅ Open/Close
- ✅ État
- ✅ Alertes

```tsx
<ValveTile entity={entity} onControl={handleControl} />
```

### 7. **SensorTile** - Capteurs

Supporte automatiquement :
- 🌡️ Température, humidité, pression
- ⚡ Puissance, énergie, voltage
- ☀️ Luminosité, UV
- 🌬️ Qualité air, CO2, VOC
- 🔋 Batterie
- Et tous les autres types de capteurs

```tsx
<SensorTile entity={entity} />
```

### 8. **AlertTile** - Alertes & Sécurité

Détecte automatiquement :
- 🚨 Mouvement, ouverture, vibration
- 🔥 Fumée, gaz, CO
- 💧 Fuite d'eau
- 🛡️ Anti-sabotage (tamper)
- ⚠️ Problèmes système

Niveaux de criticité : `critical` | `warning` | `info`

```tsx
<AlertTile entity={entity} />
```

### 9. **UpdateTile** - Mises à jour firmware (OTA)

Supporte :
- ✅ Détection version installée/disponible
- ✅ Progression installation
- ✅ Garde-fous batterie (<30%)
- ✅ Détection appareil endormi
- ✅ États : downloading/installing/verifying

```tsx
<UpdateTile entity={entity} onUpdate={handleUpdate} />
```

## 🚀 Utilisation

### Utilisation basique

```tsx
import { UniversalEntityTile } from "@/components/entities/UniversalEntityTile";

// Dans votre composant
<UniversalEntityTile entity={entity} />
```

C'est tout ! Le composant détecte automatiquement le type et affiche le bon widget.

### Exemple complet

```tsx
import { UniversalEntityTile } from "@/components/entities/UniversalEntityTile";

function RoomPage() {
  const entities = useHAStore((state) => state.entities);
  
  return (
    <div className="space-y-3">
      {entities.map((entity) => (
        <UniversalEntityTile key={entity.entity_id} entity={entity} />
      ))}
    </div>
  );
}
```

### Utilitaires disponibles

```tsx
import {
  getEntityDomain,
  getBestWidgetForEntity,
  supportsFeature,
  formatSensorValue,
  isBatteryTooLow,
  isAlert,
  getAlertSeverity,
  translateDeviceClass,
} from "@/lib/entityUtils";

// Exemple : vérifier si une lumière supporte la variation
if (supportsFeature(entity, LIGHT_FEATURES.SUPPORT_BRIGHTNESS)) {
  // Afficher slider brightness
}
```

## 🔧 Ajout de nouveaux types

### 1. Créer un nouveau composant Tile

```tsx
// src/components/entities/MyNewTile.tsx
import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";

interface MyNewTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function MyNewTile({ entity, onControl }: MyNewTileProps) {
  // Votre implémentation
  return <Card>...</Card>;
}
```

### 2. Ajouter le routing dans UniversalEntityTile

```tsx
// src/components/entities/UniversalEntityTile.tsx
import { MyNewTile } from "./MyNewTile";

// Dans le switch :
case "my_new_domain":
  return <MyNewTile entity={entity} onControl={handleControl} />;
```

### 3. (Optionnel) Ajouter des utilitaires

```tsx
// src/lib/entityUtils.ts
export const MY_NEW_FEATURES = {
  SUPPORT_FEATURE_1: 1,
  SUPPORT_FEATURE_2: 2,
};
```

## 🎨 Design System

Tous les composants utilisent le design system Neolia :

- **Couleurs** : Variables HSL depuis `index.css`
- **Glassmorphisme** : Classes `.glass-card`
- **Élévation** : Classes `.elevated-subtle`
- **Animations** : Transitions fluides
- **Dark mode** : Support automatique

### Classes principales

```tsx
className="glass-card elevated-subtle elevated-active border-border/50"
```

## 📊 Supported Features

### Constantes de features

```tsx
LIGHT_FEATURES = {
  SUPPORT_BRIGHTNESS: 1,
  SUPPORT_COLOR_TEMP: 2,
  SUPPORT_EFFECT: 4,
  SUPPORT_COLOR: 16,
  // ...
}

COVER_FEATURES = {
  SUPPORT_OPEN: 1,
  SUPPORT_CLOSE: 2,
  SUPPORT_SET_POSITION: 4,
  SUPPORT_STOP: 8,
  SUPPORT_SET_TILT_POSITION: 128,
  // ...
}

CLIMATE_FEATURES = {
  SUPPORT_TARGET_TEMPERATURE: 1,
  SUPPORT_FAN_MODE: 8,
  SUPPORT_PRESET_MODE: 16,
  // ...
}

FAN_FEATURES = {
  SUPPORT_SET_SPEED: 1,
  SUPPORT_OSCILLATE: 2,
  SUPPORT_PRESET_MODE: 8,
}
```

## 🔒 Sécurité

### Mises à jour OTA

Le système inclut des garde-fous automatiques :

- ⚠️ Batterie < 30% → Blocage avec message
- ⏸️ Appareil endormi → Avertissement
- 📊 Progression temps réel
- ❌ Gestion erreurs

### Alertes

Classification automatique par sévérité :
- 🔴 **Critical** : Fumée, gaz, problème sécurité
- 🟠 **Warning** : Mouvement, ouverture, humidité
- 🔵 **Info** : États normaux

## 🎯 Objectif : Future-Proof

Ce système est conçu pour être **100% extensible** :

1. Ajoutez un nouveau type d'entité → Créez un Tile
2. Home Assistant ajoute une feature → Utilisez `supportsFeature()`
3. Nouveau protocole (Matter, Thread) → Aucune modification nécessaire

Le système détecte **automatiquement** tout appareil et l'affiche correctement.

---

## 📝 Exemples d'utilisation

### Filtrer par type

```tsx
import { isControllable, isSensor, isAlert } from "@/lib/entityUtils";

const controllables = entities.filter(isControllable);
const sensors = entities.filter(isSensor);
const alerts = entities.filter(isAlert);
```

### Affichage conditionnel

```tsx
{getBestWidgetForEntity(entity) === "alert" && (
  <AlertBadge />
)}
```

### Formatage des valeurs

```tsx
import { formatSensorValue } from "@/lib/entityUtils";

const display = formatSensorValue(entity.state, entity.attributes.unit_of_measurement);
// "23°C" ou "45%" ou "1.2 kWh"
```

---

**🎉 Le système est prêt à l'emploi et entièrement fonctionnel !**
