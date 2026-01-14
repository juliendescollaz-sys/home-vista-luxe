# Migration React Native - Panel + App Mobile

## Objectif

Migrer l'application Neolia vers React Native pour avoir :
- **Panel Android 8"** : avec RTSP P2P + SIP natif
- **App mobile iOS** : avec support complet interphone
- **App mobile Android** : avec support complet interphone

Un seul codebase pour les 3 plateformes.

## Pourquoi React Native ?

| Critère | PWA/Capacitor | Kotlin natif | React Native |
|---------|---------------|--------------|--------------|
| RTSP P2P direct | Non (WebView) | Oui | Oui |
| SIP/RTP natif | Non | Oui | Oui |
| UI React existante | Oui | Non (refaire) | Oui (adapter) |
| Code partagé iOS/Android | Oui | Non | Oui |
| Accès APIs natives | Limité | Complet | Complet |

## Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 JavaScript Layer                      │   │
│  │  - UI Components (React)                             │   │
│  │  - Navigation (React Navigation)                     │   │
│  │  - State Management (Zustand)                        │   │
│  │  - Home Assistant WebSocket client                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                     Native Bridge                            │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Native Modules                        │   │
│  │  ┌─────────────────┐  ┌─────────────────────────┐    │   │
│  │  │ react-native-   │  │ Module SIP custom       │    │   │
│  │  │ video (RTSP)    │  │ (Linphone SDK)          │    │   │
│  │  │ ExoPlayer (And) │  │                         │    │   │
│  │  │ VLCKit (iOS)    │  │ - Register/Unregister   │    │   │
│  │  └─────────────────┘  │ - Answer/Hangup         │    │   │
│  │                       │ - DTMF (ouvrir porte)   │    │   │
│  │                       │ - CallKit (iOS)         │    │   │
│  │                       └─────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Akuvox  │   │   Home   │   │   VPS    │
        │  E12W    │   │Assistant │   │ Neolia   │
        │          │   │          │   │          │
        │ RTSP P2P │   │ WebSocket│   │ Kamailio │
        │ SIP/RTP  │   │          │   │ (backup) │
        └──────────┘   └──────────┘   └──────────┘
```

## Flux vidéo RTSP P2P

```
Panel/Mobile ◄──── RTSP direct ────► Akuvox E12W
     │                                    │
     │         Même réseau local          │
     │         rtsp://192.168.x.x/live    │
     └────────────────────────────────────┘
```

**Android** : `react-native-video` v6+ utilise ExoPlayer qui supporte RTSP nativement.

**iOS** : AVPlayer ne supporte pas RTSP. Options :
- `react-native-vlc-media-player` (VLCKit)
- `react-native-ffmpeg` avec lecteur custom
- Continuer avec WHEP via MediaMTX (moins optimal mais fonctionnel)

## Composants PWA à migrer

### Structure actuelle (React Web + Tailwind)

```
src/
├── ui/panel/
│   ├── PanelRootLayout.tsx      # Layout principal avec sidebar
│   ├── PanelOnboarding.tsx      # Configuration initiale
│   ├── components/
│   │   ├── NeoliaLoadingScreen.tsx
│   │   ├── PanelRoomCard.tsx
│   │   └── PanelSnEntryStep.tsx
│   └── pages/
│       ├── PanelHome.tsx        # Accueil avec météo + appareils actifs
│       ├── PanelRooms.tsx       # Liste des pièces
│       ├── PanelRoomDetails.tsx # Détail d'une pièce
│       ├── PanelFavorites.tsx   # Entités favorites
│       ├── PanelScenes.tsx      # Scènes HA
│       ├── PanelRoutines.tsx    # Automations
│       ├── PanelSettings.tsx    # Paramètres
│       └── ...
├── components/
│   ├── panel/
│   │   ├── IncomingCallOverlay.tsx  # Overlay appel entrant
│   │   └── IntercomSettingsCard.tsx # Config interphone
│   ├── PanelSidebar.tsx         # Navigation latérale
│   ├── TopBarPanel.tsx          # Barre supérieure
│   ├── SortableDeviceCard.tsx   # Carte appareil
│   ├── MediaPlayerCard.tsx      # Carte lecteur média
│   └── weather/
│       └── AnimatedWeatherTile.tsx
├── store/
│   └── useHAStore.ts            # Store Zustand pour HA
├── hooks/
│   ├── usePanelIntercom.ts      # Hook interphone
│   └── useNeoliaPanelConfigLoader.ts
└── services/
    ├── haConfig.ts              # Config Home Assistant
    └── websocket.ts             # Client WebSocket HA
```

### Mapping vers React Native

| PWA (Web) | React Native |
|-----------|--------------|
| `react-router-dom` | `@react-navigation/native` |
| Tailwind CSS | `nativewind` ou StyleSheet |
| `shadcn/ui` | `react-native-paper` ou custom |
| WebSocket natif | WebSocket natif (identique) |
| Zustand | Zustand (identique) |
| `<video>` WHEP | `react-native-video` RTSP |

## Module SIP natif (Linphone)

### Android (Kotlin)

```kotlin
// android/app/src/main/java/com/neolia/sip/LinphoneModule.kt
class LinphoneModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var core: Core? = null

    @ReactMethod
    fun initialize() {
        val factory = Factory.instance()
        core = factory.createCore(null, null, reactApplicationContext)
        core?.start()
    }

    @ReactMethod
    fun register(server: String, username: String, password: String) {
        // Configuration SIP
    }

    @ReactMethod
    fun answer() {
        core?.currentCall?.accept()
    }

    @ReactMethod
    fun hangup() {
        core?.currentCall?.terminate()
    }

    @ReactMethod
    fun sendDtmf(code: String) {
        code.forEach { core?.currentCall?.sendDtmf(it) }
    }
}
```

### iOS (Swift)

```swift
// ios/LinphoneModule.swift
@objc(LinphoneModule)
class LinphoneModule: NSObject {
    var core: Core?

    @objc func initialize() {
        let factory = Factory.instance
        core = try? factory.createCore(configPath: nil, factoryConfigPath: nil, systemContext: nil)
        try? core?.start()
    }

    @objc func register(_ server: String, username: String, password: String) {
        // Configuration SIP
    }

    @objc func answer() {
        try? core?.currentCall?.accept()
    }
}
```

### Utilisation côté JS

```typescript
// src/native/SipModule.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

const { LinphoneModule } = NativeModules;
const sipEmitter = new NativeEventEmitter(LinphoneModule);

export const SipService = {
  initialize: () => LinphoneModule.initialize(),
  register: (server: string, user: string, pass: string) =>
    LinphoneModule.register(server, user, pass),
  answer: () => LinphoneModule.answer(),
  hangup: () => LinphoneModule.hangup(),
  sendDtmf: (code: string) => LinphoneModule.sendDtmf(code),

  // Événements
  onIncomingCall: (callback: (caller: string) => void) =>
    sipEmitter.addListener('onIncomingCall', callback),
  onCallStateChanged: (callback: (state: string) => void) =>
    sipEmitter.addListener('onCallStateChanged', callback),
};
```

## Plan de migration

### Phase 1 : Setup projet React Native
- [ ] Créer projet avec `npx react-native init NeoliaApp`
- [ ] Configurer `nativewind` pour Tailwind
- [ ] Setup navigation avec `@react-navigation/native`
- [ ] Configurer Zustand (copier depuis PWA)

### Phase 2 : Migration UI
- [ ] Convertir composants de base (Button, Card, etc.)
- [ ] Migrer `PanelHome` avec météo
- [ ] Migrer `PanelRooms` et `PanelRoomDetails`
- [ ] Migrer `PanelSettings`
- [ ] Migrer `IncomingCallOverlay`

### Phase 3 : Intégration Home Assistant
- [ ] Copier le client WebSocket (quasi identique)
- [ ] Adapter le store Zustand
- [ ] Tester connexion et contrôle entités

### Phase 4 : Module SIP natif
- [ ] Créer module Android avec Linphone SDK
- [ ] Créer module iOS avec Linphone SDK
- [ ] Bridge vers JavaScript
- [ ] Tester appels SIP

### Phase 5 : Vidéo RTSP
- [ ] Intégrer `react-native-video` pour Android
- [ ] Intégrer VLCKit pour iOS (ou fallback WHEP)
- [ ] Tester flux RTSP P2P

### Phase 6 : Optimisations Panel 8"
- [ ] Adapter layout pour écran 1280x800
- [ ] Mode kiosk Android
- [ ] Auto-start au boot

## Dépendances React Native

```json
{
  "dependencies": {
    "react-native": "^0.73.x",
    "@react-navigation/native": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    "react-native-screens": "^3.x",
    "react-native-safe-area-context": "^4.x",
    "react-native-video": "^6.x",
    "zustand": "^4.x",
    "nativewind": "^4.x"
  },
  "devDependencies": {
    "tailwindcss": "^3.x"
  }
}
```

## Ressources

- [React Native Video](https://github.com/TheWidlarzGroup/react-native-video)
- [Linphone SDK](https://linphone.org/technical-corner/linphone-sdk)
- [NativeWind (Tailwind pour RN)](https://www.nativewind.dev/)
- [React Navigation](https://reactnavigation.org/)

## Estimation

- **Phase 1-2** : Setup + Migration UI de base
- **Phase 3** : Intégration Home Assistant
- **Phase 4-5** : SIP + RTSP natifs
- **Phase 6** : Polish et optimisations

---
*Document créé le 2025-01-14*
*Contexte : Migration vers React Native pour support RTSP P2P et SIP natif*
