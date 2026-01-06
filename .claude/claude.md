# Contexte projet Home Vista Luxe

## Communication
- **TOUJOURS tutoyer l'utilisateur (Julien)**
- Ton direct et concis, pas de formules de politesse excessives
- Répondre en français

## Workflow Git - IMPORTANT

### Branche principale
- **Branche principale : `main`** (PAS `master`)
- Lovable.dev lit UNIQUEMENT la branche `main`

### Après chaque modification de code
1. Commiter les changements
2. Merger sur `main`
3. Pusher sur GitHub

```bash
git add .
git commit -m "description du changement"
git checkout main
git merge <branche-worktree>
git push origin main
git checkout <branche-worktree>
```

### Worktrees
- Claude Code travaille dans des worktrees temporaires (ex: `youthful-sutherland`)
- Les changements doivent TOUJOURS être mergés sur `main` pour être visibles sur Lovable

## Architecture du projet

### Stack technique
- **Frontend** : React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **State** : Zustand (stores dans `src/store/`)
- **PWA** : Service Worker pour mode hors-ligne
- **Futur** : Capacitor pour apps iOS/Android natives

### Déploiement
- **Lovable.dev** : héberge la PWA (lit depuis `main` sur GitHub)
- **VPS** : `141.227.158.64` (sip.neolia.app)
  - Kamailio (SIP proxy)
  - MediaMTX (RTSP → WebRTC)
  - Coturn (TURN server)
  - RTPEngine (installé, pour futur usage)

### Infrastructure SIP/Vidéo
- **Akuvox E12W** : Interphone vidéo
  - SIP/RTP pour audio (ne supporte PAS WebRTC/DTLS)
  - RTSP pour vidéo
- **MediaMTX** : Convertit RTSP → WebRTC WHEP
- **Raspberry Pi** : Héberge MediaMTX en local

## Points techniques importants

### Audio SIP sur PWA - NE FONCTIONNE PAS
L'audio SIP ne fonctionne pas en PWA car :
- Akuvox utilise RTP classique (sans DTLS)
- Les navigateurs exigent DTLS-SRTP pour WebRTC
- **Solution** : Attendre la version Capacitor native (voir `docs/INTERCOM-SIP-NATIVE.md`)

### Vidéo WebRTC WHEP - FONCTIONNE
- La vidéo fonctionne via WHEP (WebRTC HTTP Egress Protocol)
- Détection automatique réseau local vs distant
- TURN server pour connexions hors réseau local

### iOS Safari - Particularités
- Limité à UNE seule PeerConnection WebRTC active
- getUserMedia doit être appelé suite à un geste utilisateur
- Pas d'API Network Information

## Conventions de code

### Style
- Pas d'emojis dans le code (sauf si demandé explicitement)
- Commentaires en français
- TypeScript strict

### Messages de commit
- En anglais
- Format : `type: description`
- Types : `feat`, `fix`, `refactor`, `docs`, `chore`
- Terminer par : `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

### Structure des fichiers
```
src/
├── components/     # Composants React réutilisables
├── pages/          # Pages/écrans de l'app
├── hooks/          # Custom hooks React
├── services/       # Services (SIP, WebSocket, etc.)
├── store/          # Stores Zustand
├── types/          # Types TypeScript
└── lib/            # Utilitaires
```

## Serveurs et accès

### VPS Neolia (141.227.158.64)
- SSH : `ssh debian@141.227.158.64`
- Services : Kamailio, MediaMTX, Coturn, RTPEngine

### URLs importantes
- PWA : https://home-vista-luxe.lovable.app
- WebRTC vidéo : https://webrtc.neolia.app
- SIP WebSocket : wss://sip.neolia.app:8443

## Tests
- Toujours tester sur iPhone (Safari PWA) ET sur PC
- Le panel mural est en mode Android natif (Capacitor)
- La config MediaMTX est persistée en localStorage

## Documentation technique
- `docs/INTERCOM-SIP-NATIVE.md` : Plan migration SIP vers Capacitor natif
