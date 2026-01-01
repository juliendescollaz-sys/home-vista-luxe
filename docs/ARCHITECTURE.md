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

### Backend (VPS OVH)

**Docker Compose Services :**

1. **Traefik** (Reverse Proxy)
   - Ports : 80, 443, 8080
   - SSL/TLS automatique (Let's Encrypt)
   - Routes :
     - `api.sip.neolia.ch` → Backend
     - `sip.neolia.ch` → Asterisk WebSocket
     - `livekit.sip.neolia.ch` → LiveKit

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

---

### Frontend (App React)

**Stack :**
- React 18 + TypeScript
- Vite (build tool)
- Capacitor (iOS/Android)
- shadcn/ui (composants)
- Zustand (state management)

**Services créés :**
- `src/services/livekitService.ts` - Client LiveKit
- `src/services/websocketService.ts` - WebSocket temps réel
- `src/services/intercomService.ts` - API backend
- `src/services/sipService.ts` - JsSIP (à remplacer par SDK natif)

**Stores :**
- `src/store/intercomStore.ts` - État des appels

**Hooks :**
- `src/hooks/useVideoCall.ts` - Gestion appels vidéo

**Pages :**
- `src/pages/IntercomTest.tsx` - Interface d'appel

---

## Flow d'un Appel Entrant
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
2. **LiveKit Ingress** (capture RTSP Akuvox)
3. **Push notifications** (FCM + CallKit)
4. **Admin web** (multi-tenant)
5. **Monitoring** (UptimeRobot, Sentry)
