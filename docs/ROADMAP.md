# Neolia - Roadmap Projet Interphonie

## Vision Produit

Application unique Neolia (iOS/Android/APK custom) intégrant :
- **Domotique** : Home Assistant (mode avancé) + Smart Lite (contrôle IP direct)
- **Interphonie** : Appels vidéo SIP/WebRTC avec audio bidirectionnel
- **Gestion énergétique**

## Objectif MVP (6 mois)

- ~100 utilisateurs (10 immeubles × 10 appartements)
- Interphonie fonctionnelle avec vidéo + audio
- Scalable jusqu'à milliers d'utilisateurs

---

## Phase 1 : Infrastructure Backend ✅ (TERMINÉ)

**Objectif** : Serveur SIP + WebRTC opérationnel

### Réalisations
- [x] VPS OVH déployé avec Docker
- [x] Asterisk configuré (SIP server)
- [x] LiveKit installé (WebRTC server)
- [x] Backend FastAPI avec webhooks
- [x] PostgreSQL pour données
- [x] Traefik reverse proxy + SSL
- [x] Domaines : sip.neolia.ch, api.sip.neolia.ch, livekit.sip.neolia.ch

---

## Phase 2 : Intégration App ✅ (TERMINÉ)

**Objectif** : App React reçoit les appels avec vidéo

### Réalisations
- [x] WebSocket temps réel backend → app
- [x] Store Zustand pour état des appels
- [x] Interface d'appel entrant (sonnerie, accepter/rejeter)
- [x] LiveKit client intégré (vidéo WebRTC)
- [x] Flow complet : Akuvox appelle → App affiche l'appel
- [x] **Vidéo Akuvox via MediaMTX (alternative à LiveKit Ingress)** ✅ NOUVEAU

---

## Phase 2.5 : Vidéo Akuvox WebRTC Direct ✅ (TERMINÉ - Jan 2025)

**Objectif** : Streaming vidéo Akuvox optimisé (MediaMTX sur Raspberry Pi)

### Réalisations
- [x] Infrastructure Raspberry Pi + MediaMTX déployée
- [x] Conversion RTSP → WebRTC via protocole WHEP
- [x] Service WebRTC React (`akuvoxWebRTCService.ts`)
- [x] Hook React avec détection auto Panel/Mobile (`useAkuvoxVideo.ts`)
- [x] Store configuration MediaMTX + TURN (`useMediaMTXConfigStore.ts`)
- [x] Composants UI réutilisables (`AkuvoxVideoStream`, `MediaMTXConfigDialog`)
- [x] Page de test avec toggle LiveKit/Akuvox
- [x] Mode Panel : Connexion LAN directe (pas de TURN)
- [x] Mode Mobile : Connexion via TURN (VPS OVH)
- [x] Documentation complète (`docs/AKUVOX_INTEGRATION.md`)

**Avantages :**
- Latence réduite en mode Panel (pas de transit via VPS)
- Architecture scalable (un Raspberry par immeuble)
- Configuration dynamique (IP DHCP supportée)

---

## Phase 3 : Audio Bidirectionnel (PROCHAINE ÉTAPE)

**Objectif** : Conversation audio stable

### Tâches
- [ ] Intégrer Linphone SDK iOS (Swift + Capacitor plugin)
- [ ] Intégrer Linphone SDK Android (Kotlin + Capacitor plugin)
- [ ] Bridge TypeScript ↔ SDK natif
- [ ] Tester audio bidirectionnel Akuvox ↔ App
- [ ] Gérer CallKit (iOS) / ConnectionService (Android)

**Temps estimé** : 2-3 jours

---

## Phase 4 : ~~Vidéo de l'Interphone~~ ✅ (REMPLACÉ PAR PHASE 2.5)

~~**Objectif** : Afficher la caméra de l'Akuvox dans l'app~~

**Status** : Remplacé par l'intégration MediaMTX (Phase 2.5) qui offre de meilleures performances en mode Panel.

---

## Phase 5 : Intégration Audio + Vidéo (NOUVEAU)

**Objectif** : Combiner audio SIP avec vidéo Akuvox WebRTC

### Tâches
- [ ] Synchroniser démarrage audio SIP + vidéo WebRTC
- [ ] Tester latence audio/vidéo combinés
- [ ] Gérer états combinés (connection, disconnection)
- [ ] Interface unifiée pour contrôles (mute, speaker, etc.)

**Temps estimé** : 1-2 jours

---

## Timeline Globale (Mise à jour Jan 2025)

- ✅ **Semaines 1-2** : Vidéo Akuvox WebRTC (Phase 2.5) → **TERMINÉ**
- **Semaine 3-4** : Audio bidirectionnel (Phase 3)
- **Semaine 5** : Intégration Audio + Vidéo (Phase 5)
- **Semaine 6-7** : Push notifications
- **Semaine 8-9** : Multi-tenant
- **Semaine 10-12** : Production

**Total : ~12 semaines jusqu'au MVP production-ready**
