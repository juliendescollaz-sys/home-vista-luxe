# Contexte projet Home Vista Luxe

## Communication
- **TOUJOURS tutoyer l'utilisatrice (Julie)**
- Ton direct et concis, pas de formules de politesse excessives

## Workflow Git
- **Branche principale : `main`** (PAS `master`)
- Les commits doivent TOUJOURS être mergés sur `main` à la fin
- Workflow : worktree temporaire → commit → merge sur main → push

## Architecture du projet
- Application React + TypeScript + Vite
- PWA avec Capacitor pour iOS/Android
- Panel mural (tablette Android 10" murale)
- Backend : Raspberry Pi avec MediaMTX pour streaming vidéo Akuvox

## Spécificités techniques
- **Akuvox E12W** : Interphone avec flux RTSP → MediaMTX → WebRTC WHEP
- **Détection réseau automatique** :
  - WiFi local → connexion directe au Raspberry Pi (pas de TURN)
  - 4G/Cellular → connexion via VPS avec serveur TURN
- **Mixed Content** : Impossible de faire des requêtes HTTP depuis HTTPS
  - Utiliser l'API Network Information pour détecter WiFi vs Cellular

## Conventions de code
- Pas d'emojis dans le code (sauf si demandé explicitement)
- Commentaires en français
- Messages de commit en anglais avec émoji 🤖 Generated with Claude Code

## Points d'attention
- Toujours tester sur iPhone (Safari PWA) ET sur PC
- Le panel mural est en mode Android natif (Capacitor)
- La config MediaMTX est persistée en localStorage
