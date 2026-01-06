# Interphone SIP - Migration vers App Native

## Contexte

L'audio bidirectionnel SIP avec l'Akuvox E12W ne fonctionne pas en PWA sur iOS Safari en raison d'une incompatibilité fondamentale :

- **Akuvox** : utilise SIP/RTP classique (sans chiffrement DTLS)
- **Navigateurs WebRTC** : exigent DTLS-SRTP pour toute connexion audio/vidéo
- **JsSIP** (et tous les SDK SIP web) : utilisent WebRTC sous le capot, donc soumis à cette contrainte

### Erreur rencontrée
```
InvalidAccessError: Failed to set remote offer sdp: Called with SDP without DTLS fingerprint.
```

## Solution : App Native avec Capacitor

La PWA sera encapsulée avec Capacitor pour créer des apps iOS et Android natives. Cela résoudra le problème car les SDK SIP natifs (comme Outils SIP ou Outils SIP natif iOS/Android) peuvent communiquer en RTP classique sans DTLS.

## Ce qui fonctionne actuellement (à conserver)

1. **Vidéo WHEP** : fonctionne parfaitement via WebRTC
2. **Signalisation SIP** : WebSocket vers Kamailio fonctionne
3. **Détection d'appel entrant** : notifications reçues correctement
4. **Interface utilisateur** : complète et fonctionnelle

## Plugins Capacitor recommandés pour SIP natif

### Option 1 : capacitor-voip-ios (iOS uniquement)
- Intégration CallKit native
- Push notifications VoIP (PushKit)
- https://github.com/nicholasricci/capacitor-voip

### Option 2 : Plugin custom avec SRTP natif
- Wrapper autour de SRTP (Outils SIP natif)
- Plus de contrôle mais plus de travail

### Option 3 : Outils SIP SDK
- Outils SIP a un SDK officiel pour iOS et Android
- Maturité éprouvée (Linphone fonctionnait)
- https://outils-sip.org/outils-sip-sdk/

## Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│                    App Capacitor                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   WebView       │    │    Native Layer             │ │
│  │                 │    │                             │ │
│  │  - UI React     │    │  - SIP SDK (audio)          │ │
│  │  - Vidéo WHEP   │◄──►│  - CallKit (iOS)            │ │
│  │  - Contrôles    │    │  - Push VoIP                │ │
│  │                 │    │                             │ │
│  └─────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Serveur VPS                           │
│  - Kamailio (SIP proxy)                                 │
│  - MediaMTX (RTSP→WebRTC pour vidéo)                    │
│  - Coturn (TURN pour WebRTC vidéo)                      │
│  - RTPEngine (optionnel, pas nécessaire avec SDK natif) │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Akuvox E12W                           │
│  - SIP/RTP (audio)                                      │
│  - RTSP (vidéo)                                         │
└─────────────────────────────────────────────────────────┘
```

## Avantages de l'app native

1. **CallKit sur iOS** : appels intégrés au système (écran verrouillé, historique)
2. **Push VoIP** : notifications même app fermée
3. **Audio natif** : pas de contrainte WebRTC/DTLS
4. **Performance** : meilleure gestion batterie

## Notes techniques

- RTPEngine a été installé sur le VPS (141.227.158.64) mais n'est pas nécessaire avec SDK SIP natif
- La config Kamailio actuelle supporte déjà WebSocket pour la signalisation
- Le serveur TURN (Coturn) reste utile pour la vidéo WebRTC en mobilité

## Prochaines étapes

1. Finaliser l'UI et les fonctionnalités en mode PWA (sans audio SIP)
2. Configurer Capacitor pour iOS et Android
3. Intégrer un plugin SIP natif
4. Tester l'audio bidirectionnel
5. Publier sur les stores

---
*Document créé le 2026-01-06*
*Contexte : debug SIP WebRTC sur iOS Safari*
