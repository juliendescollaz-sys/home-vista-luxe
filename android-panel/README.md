# Neolia Panel - Android Natif

Application Android native pour le panel mural 8" Neolia.

## Architecture

Ce projet est une application **100% native Kotlin** (pas de Capacitor/React Native) optimisée pour :
- Connexion directe P2P à l'interphone Akuvox
- Latence minimale pour vidéo RTSP et audio SIP
- Fonctionnement hors-ligne (pas de dépendance à un serveur intermédiaire)

## Stack Technique

- **UI** : Jetpack Compose + Material 3
- **Vidéo** : ExoPlayer avec support RTSP natif
- **Audio SIP** : Linphone SDK (SIP/RTP sans SRTP/DTLS)
- **Home Assistant** : WebSocket client OkHttp
- **Persistence** : DataStore Preferences

## Connexion P2P

```
┌─────────────┐     RTSP (vidéo)      ┌─────────────┐
│   Panel     │◄─────────────────────►│   Akuvox    │
│   Android   │     SIP/RTP (audio)   │   E12W      │
└─────────────┘◄─────────────────────►└─────────────┘
       │
       │ WebSocket
       ▼
┌─────────────┐
│    Home     │
│  Assistant  │
└─────────────┘
```

## Différences avec la PWA Lovable

| Fonctionnalité | PWA Lovable | Android Natif |
|----------------|-------------|---------------|
| Vidéo | WHEP via MediaMTX | RTSP direct P2P |
| Audio SIP | Non supporté | Linphone SDK natif |
| Latence vidéo | ~500ms | ~100ms |
| Fonctionnement hors-ligne | Limité | Complet |

## Build

```bash
# Dans Android Studio
./gradlew assembleDebug

# APK généré dans
# app/build/outputs/apk/debug/app-debug.apk
```

## Configuration requise

1. **Panel 8"** avec Android 8.0+ (API 26)
2. **Akuvox E12W** sur le même réseau local
3. **Home Assistant** accessible en WebSocket

## Structure du projet

```
android-panel/
├── app/
│   ├── src/main/
│   │   ├── java/com/neolia/panel/
│   │   │   ├── MainActivity.kt          # Entry point
│   │   │   ├── NeoliaApp.kt             # Application class
│   │   │   ├── data/
│   │   │   │   └── PanelConfig.kt       # DataStore config
│   │   │   ├── ha/
│   │   │   │   └── HomeAssistantClient.kt  # WebSocket HA
│   │   │   ├── service/
│   │   │   │   └── SipService.kt        # Foreground service
│   │   │   ├── sip/
│   │   │   │   └── LinphoneManager.kt   # SIP/RTP
│   │   │   └── ui/
│   │   │       ├── call/
│   │   │       │   └── IncomingCallActivity.kt
│   │   │       ├── components/
│   │   │       │   ├── DeviceCard.kt
│   │   │       │   └── WeatherCard.kt
│   │   │       ├── navigation/
│   │   │       │   ├── BottomNavBar.kt
│   │   │       │   └── NavRoute.kt
│   │   │       ├── screens/
│   │   │       │   ├── HomeScreen.kt
│   │   │       │   ├── RoomsScreen.kt
│   │   │       │   ├── FavoritesScreen.kt
│   │   │       │   └── SettingsScreen.kt
│   │   │       └── theme/
│   │   │           └── Theme.kt
│   │   └── res/
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```
