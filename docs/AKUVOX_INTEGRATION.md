# Intégration Vidéo Interphone Akuvox E12W

## Vue d'ensemble

Ce document décrit l'intégration de la vidéo de l'interphone Akuvox E12W dans l'app Neolia via WebRTC natif et le protocole WHEP.

### Architecture

```
┌─────────────────┐      RTSP       ┌──────────────────┐      WebRTC WHEP      ┌─────────────┐
│  Akuvox E12W    │ ──────────────> │  Raspberry Pi    │ <──────────────────── │  App Neolia │
│  Interphone     │                 │  (MediaMTX)      │                       │  (React)    │
└─────────────────┘                 └──────────────────┘                       └─────────────┘
   192.168.1.51                        192.168.1.115                            Panel/Mobile
   RTSP Port 554                       WHEP Port 8889
```

### Stack technique

#### Backend (déjà déployé)
- **VPS OVH** (141.227.158.64)
  - Coturn (serveur TURN) : port 3478 UDP/TCP
  - Credentials : `neolia:Neolia022Turn`
  - Ports relay : 49152-49200 UDP

- **Raspberry Pi** (IP DHCP, ex: 192.168.1.115)
  - MediaMTX : convertit RTSP → WebRTC
  - Port RTSP : 8554
  - Port WebRTC : 8889
  - Endpoint WHEP : `http://<raspberry-ip>:8889/akuvox/whep`
  - API Configuration : port 8080

- **Akuvox E12W** (192.168.1.51 - IP fixe recommandée)
  - Flux RTSP : `rtsp://admin:Neolia022@192.168.1.51:554/livestream/11`
  - Codec vidéo : H.264 Baseline, 704x576, 30fps
  - Codec audio : PCM µ-law, 8000 Hz

#### Frontend (React - cette intégration)

##### Nouveaux fichiers créés

1. **Services**
   - `src/services/akuvoxWebRTCService.ts` : Service WebRTC implémentant le protocole WHEP

2. **Stores**
   - `src/store/useMediaMTXConfigStore.ts` : Store Zustand pour la config MediaMTX (IP Raspberry, TURN)

3. **Hooks**
   - `src/hooks/useAkuvoxVideo.ts` : Hook React pour gérer la connexion WebRTC

4. **Composants**
   - `src/components/AkuvoxVideoStream.tsx` : Composant vidéo réutilisable
   - `src/components/MediaMTXConfigDialog.tsx` : Dialog de configuration

5. **Pages**
   - `src/pages/IntercomTest.tsx` : Page de test mise à jour (switch LiveKit/Akuvox)

## Modes de fonctionnement

### Mode Panel (APK Android - LAN uniquement)

**Configuration :**
- Connexion WebRTC **DIRECTE** vers MediaMTX
- ICE servers : STUN uniquement (`stun:stun.l.google.com:19302`)
- **Pas de serveur TURN**
- Fonctionne uniquement si Panel et Raspberry Pi sont sur le même LAN

**Détection :**
```typescript
// Automatique via useDisplayMode()
displayMode === 'panel' → connectionMode = 'panel'
```

### Mode Mobile/Tablet (iOS/Android - Remote)

**Configuration :**
- Connexion WebRTC via serveur **TURN** (VPS)
- ICE servers : STUN + TURN
  - STUN : `stun:stun.l.google.com:19302`
  - TURN : `turn:141.227.158.64:3478`
  - Username : `neolia`
  - Credential : `Neolia022Turn`
- Fonctionne partout (WiFi, 4G, 5G)

**Détection :**
```typescript
// Automatique via useDisplayMode()
displayMode === 'mobile' | 'tablet' → connectionMode = 'mobile'
```

## Utilisation

### Configuration initiale

1. **Configurer l'IP du Raspberry Pi**
   - Ouvrir la page `/intercom-test`
   - Cliquer sur "Configuration MediaMTX"
   - Saisir l'IP du Raspberry Pi (ex: `192.168.1.115`)
   - Vérifier la config TURN (pré-remplie)
   - Sauvegarder

2. **La configuration est persistée** en localStorage via Zustand persist

### Intégration dans un composant

```tsx
import { AkuvoxVideoStream } from '@/components/AkuvoxVideoStream';

function MyComponent() {
  return (
    <AkuvoxVideoStream
      autoConnect={true}
      showDebugInfo={import.meta.env.DEV}
      onConnected={() => console.log('Vidéo connectée!')}
      onError={(error) => toast.error(error)}
    />
  );
}
```

### Hook personnalisé

```tsx
import { useAkuvoxVideo } from '@/hooks/useAkuvoxVideo';

function MyCustomComponent() {
  const {
    status,
    stream,
    videoRef,
    connect,
    disconnect,
    connectionMode,
  } = useAkuvoxVideo();

  return (
    <div>
      <p>Status: {status}</p>
      <p>Mode: {connectionMode}</p>
      <video ref={videoRef} autoPlay playsInline />
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

## Configuration MediaMTX

### Structure du store

```typescript
interface MediaMTXConfig {
  raspberryPiIp: string;      // ex: "192.168.1.115"
  whepPort: number;            // 8889
  streamName: string;          // "akuvox"
  whepUrl: string;             // généré automatiquement
  lastUpdated: number;
}

interface TurnServerConfig {
  url: string;                 // "turn:141.227.158.64:3478"
  username: string;            // "neolia"
  credential: string;          // "Neolia022Turn"
}
```

### API du store

```typescript
const {
  config,                     // MediaMTXConfig | null
  turnConfig,                 // TurnServerConfig
  setRaspberryPiIp,          // (ip: string) => void
  setConfig,                  // (config: Partial<MediaMTXConfig>) => void
  setTurnConfig,             // (config: Partial<TurnServerConfig>) => void
} = useMediaMTXConfigStore();

const isValid = useIsMediaMTXConfigValid(); // boolean
```

## Protocole WHEP

Le protocole WHEP (WebRTC-HTTP Egress Protocol) est implémenté comme suit :

1. **Créer RTCPeerConnection** avec les ICE servers appropriés
2. **Ajouter des transceivers** en mode `recvonly` (vidéo + audio)
3. **Créer une SDP offer**
4. **POST l'offer** au endpoint WHEP : `http://<ip>:8889/akuvox/whep`
   - Content-Type: `application/sdp`
   - Body: SDP offer
5. **Recevoir la SDP answer** en texte
6. **Appliquer l'answer** via `setRemoteDescription`
7. **Recevoir les tracks** via l'événement `ontrack`

## Tests

### Page de test

URL : `/intercom-test`

**Fonctionnalités :**
- Switch entre LiveKit (ancien) et Akuvox WebRTC (nouveau)
- Configuration MediaMTX via dialog
- Simulation d'appel entrant
- Affichage du mode détecté (Panel LAN / Mobile TURN)
- Debug info en mode développement

### Tests manuels

#### Test LAN (Panel)
1. Builder l'APK en mode Panel : `npm run build:panel:android`
2. Installer sur une tablette Android
3. Vérifier que `displayMode === 'panel'`
4. Configurer l'IP du Raspberry Pi
5. Simuler un appel
6. Vérifier dans les logs : "🏠 Using direct LAN connection (Panel mode)"
7. Vérifier la vidéo en plein écran

#### Test Remote (Mobile/Tablet via TURN)
1. Builder l'APK en mode Mobile : `npm run build:mobile:android`
2. Installer sur un smartphone
3. Se connecter en 4G (pas sur le même LAN que le Raspberry)
4. Configurer l'IP du Raspberry Pi
5. Simuler un appel
6. Vérifier dans les logs : "🌐 Using TURN server for remote connection"
7. Vérifier la vidéo via le relay TURN

## Troubleshooting

### Erreur "Configuration MediaMTX invalide"
- Vérifier que l'IP du Raspberry Pi est correctement saisie
- Vérifier le format : `xxx.xxx.xxx.xxx`

### Vidéo ne s'affiche pas (Panel mode)
- Vérifier que Panel et Raspberry Pi sont sur le même réseau
- Vérifier que le Raspberry Pi est accessible : `ping <ip>`
- Vérifier que MediaMTX est démarré sur le Raspberry
- Vérifier l'URL WHEP : `http://<ip>:8889/akuvox/whep`

### Vidéo ne s'affiche pas (Mobile mode)
- Vérifier que le serveur TURN est accessible
- Vérifier les credentials TURN
- Regarder les logs ICE dans la console
- Vérifier que les ports relay (49152-49200) sont ouverts sur le VPS

### ICE connection failed
- Mode Panel : vérifier la connectivité LAN
- Mode Mobile : vérifier la config TURN
- Vérifier les logs `ICE candidate error` dans la console

## Architecture de déploiement

### Panel (APK Android)
```
Panel Android ──(LAN)──> Raspberry Pi (MediaMTX) ──(RTSP)──> Akuvox
  192.168.1.X            192.168.1.115               192.168.1.51
```

### Mobile/Tablet (Remote)
```
Mobile 4G ──(Internet)──> VPS TURN ~~(relay)~~> Raspberry Pi ──(RTSP)──> Akuvox
                          141.227.158.64        192.168.1.115        192.168.1.51
```

## Prochaines étapes

1. **Intégration dans la vraie app**
   - Remplacer le système LiveKit par Akuvox WebRTC
   - Intégrer dans le flux d'appel entrant réel (push notifications)

2. **Découverte automatique du Raspberry Pi**
   - Utiliser l'API de découverte réseau Neolia
   - Auto-configurer l'IP via MQTT ou mDNS

3. **Optimisations**
   - Caching de la config MediaMTX
   - Reconnexion automatique en cas de déconnexion
   - Fallback LiveKit si WebRTC échoue

4. **Tests en production**
   - Tests sur différents réseaux (WiFi, 4G, 5G)
   - Tests avec différents opérateurs mobile
   - Mesure de latence et qualité vidéo
