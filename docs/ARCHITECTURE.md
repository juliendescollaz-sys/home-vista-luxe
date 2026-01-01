# Neolia - Architecture Technique Interphonie

## Vue d'ensemble
```
┌─────────────────────────────────────────────────────────────┐
│                    INTERPHONE AKUVOX E12W                   │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  SIP Audio   │──────────────▶│ RTSP Vidéo  │            │
│  │  (RTP)       │              │  (H.264)     │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
         │                                  │
         │ SIP INVITE                       │ rtsp://IP/video1
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      VPS OVH (141.227.158.64)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     ASTERISK                           │  │
│  │  - Serveur SIP (port 5060)                            │  │
│  │  - RTP audio (ports 10000-10099)                      │  │
│  │  - NAT traversal (rtp_symmetric)                      │  │
│  │  - Extensions: 100 (Akuvox), 200 (Linphone), 201 (App)│  │
│  │  - Webhook → Backend lors d'appel                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           │ Webhook HTTP                     │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  BACKEND FASTAPI                       │  │
│  │  - Webhook /webhook/call                              │  │
│  │  - Génère tokens LiveKit JWT                          │  │
│  │  - Broadcast WebSocket → App                          │  │
│  │  - API admin (futur)                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│         │                           │                        │
│         │ WebSocket                 │ PostgreSQL             │
│         │                           ▼                        │
│         │              ┌──────────────────────┐              │
│         │              │     PostgreSQL       │              │
│         │              │  - Multi-tenant      │              │
│         │              │  - Devices, Users    │              │
│         │              └──────────────────────┘              │
│         │                                                    │
│         │              ┌──────────────────────┐              │
│         │              │      LIVEKIT         │              │
│         │              │  - WebRTC server     │              │
│         │              │  - Ports 7880-7881   │              │
│         │              │  - RTP 50000-50100   │              │
│         │              │  - Ingress RTSP (TODO)│             │
│         │              └──────────────────────┘              │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          │ WSS + HTTPS
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│               APP NEOLIA (React + Capacitor)                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  WebSocket       │  │  LiveKit Client  │                │
│  │  (appels entrants)│  │  (vidéo WebRTC)  │               │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐                                      │
│  │  Linphone SDK    │  (TODO - Audio SIP natif)            │
│  │  iOS + Android   │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Technique Détaillé

### Backend Infrastructure

#### VPS OVH (141.227.158.64)

**Docker Compose Services :**

1. **Traefik** (Reverse Proxy)
   - Ports : 80, 443, 8080
   - SSL/TLS automatique (Let's Encrypt)
   - Routes :
     - `api.sip.neolia.ch` → Backend
     - `sip.neolia.ch` → Asterisk WebSocket
     - `livekit.sip.neolia.ch` → LiveKit

1bis. **Coturn** (TURN Server) ✅ ACTIF
   - Port : 3478 UDP/TCP
   - Ports relay : 49152-49200 UDP
   - Credentials : `neolia:Neolia022Turn`
   - Realm : `turn.sip.neolia.ch`
   - Usage : Connexions WebRTC remote (Mobile/Tablet)

2. **Asterisk** (SIP Server)
   - Image : `andrius/asterisk:20`
   - Config : `/home/debian/infra/asterisk/config/`
   - Fichiers clés :
     - `pjsip.conf` - Endpoints SIP
     - `extensions.conf` - Dialplan + webhooks
     - `rtp.conf` - Ports RTP
     - `http.conf` - WebSocket

3. **LiveKit** (WebRTC Server) ✅ ACTIF
   - Image : `livekit/livekit-server:latest`
   - **URL publique** : `wss://livekit.sip.neolia.ch`
   - **URL interne** : `ws://livekit:7880`
   - **API Key** : `neolia-api-key-1234567890123456`
   - **API Secret** : `neolia-secret-key-1234567890123456789012`
   - **Ports** :
     - HTTP : 7880
     - WebSocket : 7881
     - RTC/UDP : 50000-50100
   - Config : `/home/debian/infra/livekit/livekit.yaml`
   - Redis : configuré et actif
   - Auto-création rooms : activée
   - Timeout room vide : 300 secondes
   - Max participants/room : 100
   - SSL : Let's Encrypt via Traefik
   
   > ⚠️ **Note** : Un conteneur `livekit-sip` existe avec credentials différentes (devkey/secret) - à clarifier

4. **Backend FastAPI**
   - Port : 8000
   - Code : `/home/debian/infra/backend/main.py`
   - Dépendances : fastapi, uvicorn, sqlalchemy, livekit, pyjwt

5. **PostgreSQL**
   - Port : 5432
   - Database : `neolia_db`
   - User : `neolia_user`

6. **Redis**
   - Port : 6379
   - Requis par LiveKit

#### Raspberry Pi (LAN - IP DHCP, ex: 192.168.1.115) ✅ NOUVEAU

**Docker Compose Services :**

1. **MediaMTX** (RTSP → WebRTC Converter)
   - Port RTSP : 8554
   - Port WebRTC (WHEP) : 8889
   - Endpoint : `http://<raspberry-ip>:8889/akuvox/whep`
   - Mode : `network_mode: host`
   - Source RTSP : `rtsp://admin:Neolia022@192.168.1.51:554/livestream/11` (Akuvox)
   - Usage : Streaming vidéo direct vers app (alternative à LiveKit Ingress)

2. **API Configuration** (FastAPI)
   - Port : 8080
   - Endpoints :
     - `GET /` : Retourne l'IP actuelle du Raspberry Pi
     - `POST /configure` : Configure MediaMTX dynamiquement
   - Auto-restart : Redémarre MediaMTX après changement config
   - Usage : Configuration dynamique IP Akuvox + credentials

> **Architecture alternative vidéo :** Au lieu de LiveKit Ingress (VPS), on utilise MediaMTX sur Raspberry Pi en local pour convertir RTSP→WebRTC. Avantages : pas de transit vidéo via internet en mode Panel LAN.

---

### Frontend (App React)

**Stack :**
- React 18 + TypeScript
- Vite (build tool)
- Capacitor (iOS/Android)
- shadcn/ui (composants)
- Zustand (state management)

**Services créés :**
- `src/services/livekitService.ts` - Client LiveKit (ancien système)
- `src/services/websocketService.ts` - WebSocket temps réel
- `src/services/intercomService.ts` - API backend
- `src/services/sipService.ts` - JsSIP (à remplacer par SDK natif)
- `src/services/akuvoxWebRTCService.ts` - WebRTC WHEP vers MediaMTX ✅ NOUVEAU

**Stores :**
- `src/store/intercomStore.ts` - État des appels
- `src/store/useMediaMTXConfigStore.ts` - Configuration Raspberry Pi + TURN ✅ NOUVEAU

**Hooks :**
- `src/hooks/useVideoCall.ts` - Gestion appels vidéo (LiveKit)
- `src/hooks/useAkuvoxVideo.ts` - Gestion vidéo Akuvox WebRTC ✅ NOUVEAU
- `src/hooks/useDisplayMode.ts` - Détection Panel/Mobile/Tablet

**Composants :**
- `src/components/AkuvoxVideoStream.tsx` - Affichage vidéo Akuvox ✅ NOUVEAU
- `src/components/MediaMTXConfigDialog.tsx` - Config IP Raspberry Pi ✅ NOUVEAU

**Pages :**
- `src/pages/IntercomTest.tsx` - Interface d'appel (avec toggle LiveKit/Akuvox)

---

## Flow d'un Appel Entrant

### Option 1 : LiveKit (Ancien système)
```
1. Visiteur appuie sur bouton Akuvox
   │
   ▼
2. Akuvox envoie SIP INVITE → Asterisk (extension 200)
   │
   ▼
3. Asterisk détecte l'appel → Execute dialplan
   │
   ▼
4. Dialplan appelle webhook : curl → http://backend:8000/webhook/call
   │
   ▼
5. Backend :
   - Crée room LiveKit : call-akuvox-200-{timestamp}
   - Génère 2 tokens JWT (caller + callee)
   - Broadcast WebSocket → App
   │
   ▼
6. App reçoit message WebSocket :
   {
     type: "incoming_call",
     call: {
       room: "...",
       calleeToken: "...",
       livekitUrl: "wss://livekit.sip.neolia.ch"
     }
   }
   │
   ▼
7. App affiche écran d'appel entrant (sonnerie + boutons)
   │
   ▼
8. Utilisateur accepte :
   - App répond appel SIP (Linphone SDK - TODO)
   - App rejoint room LiveKit (vidéo)
   │
   ▼
9. Communication active :
   - Audio : SIP/RTP via Asterisk
   - Vidéo : WebRTC via LiveKit (RTSP Ingress - TODO)
```

### Option 2 : Akuvox WebRTC Direct (Nouveau système) ✅ ACTIF
```
1. Visiteur appuie sur bouton Akuvox
   │
   ▼
2. Akuvox démarre flux RTSP : rtsp://192.168.1.51:554/livestream/11
   │
   ▼
3. MediaMTX (Raspberry Pi) :
   - Capture flux RTSP Akuvox
   - Convertit en WebRTC (WHEP)
   - Expose endpoint : http://192.168.1.115:8889/akuvox/whep
   │
   ▼
4. App (Simulation d'appel pour test) :
   - Affiche écran d'appel entrant
   │
   ▼
5. Utilisateur accepte :
   - Mode Panel (LAN) : Connexion WebRTC directe vers Raspberry Pi
     → ICE: STUN only, pas de TURN
   - Mode Mobile (Remote) : Connexion WebRTC via TURN
     → ICE: STUN + TURN (141.227.158.64:3478)
   │
   ▼
6. App initie connexion WHEP :
   - Crée RTCPeerConnection
   - Ajoute transceivers (video + audio recvonly)
   - Crée SDP offer
   - POST offer → http://192.168.1.115:8889/akuvox/whep
   - Reçoit SDP answer
   - Établit connexion WebRTC
   │
   ▼
7. Communication active :
   - Vidéo : WebRTC direct depuis MediaMTX
   - Audio : (TODO - intégrer avec SIP)
   - Latence réduite en mode Panel (pas de transit via internet)
```

> **Note :** L'option 2 (Akuvox WebRTC) est actuellement en test. Elle offre une latence plus faible en mode Panel car la vidéo ne transite pas par le VPS.

---

## Sécurité

**Authentification :**
- LiveKit : JWT tokens avec expiration (1h)
- SIP : Username/password par extension
- WebSocket : Connexion sécurisée WSS

**Réseau :**
- Firewall UFW : ports 22, 80, 443, 5060, 10000-20000/udp
- NAT traversal : rtp_symmetric, force_rport
- SSL/TLS : Let's Encrypt via Traefik

**Isolation :**
- Multi-tenant : Contextes SIP séparés par projet
- Docker networks : `web` (public) + `backend` (privé)

---

## Monitoring & Logs

**Logs Docker :**
```bash
docker logs backend -f
docker logs asterisk --tail 50
docker logs livekit --tail 20
```

**Fichiers importants :**
- `/home/debian/infra/docker-compose.yml`
- `/home/debian/infra/asterisk/config/`
- `/home/debian/infra/backend/main.py`

---

## Prochaines Évolutions

1. **Linphone SDK natif** (remplace JsSIP)
2. ~~**LiveKit Ingress** (capture RTSP Akuvox)~~ → **Remplacé par MediaMTX** ✅
3. **Intégrer audio SIP avec vidéo Akuvox** (combiner les 2 systèmes)
4. **Push notifications** (FCM + CallKit)
5. **Admin web** (multi-tenant)
6. **Monitoring** (UptimeRobot, Sentry)
7. **Découverte automatique Raspberry Pi** (mDNS ou API discovery)

## Documentation Complémentaire

- **Intégration Akuvox WebRTC** : Voir `docs/AKUVOX_INTEGRATION.md` pour :
  - Architecture détaillée MediaMTX
  - Guide d'utilisation des composants
  - Configuration Raspberry Pi
  - Tests et troubleshooting
