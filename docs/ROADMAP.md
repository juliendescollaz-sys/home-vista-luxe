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

## Phase 2 : Intégration App ✅ (EN COURS)

**Objectif** : App React reçoit les appels avec vidéo

### Réalisations
- [x] WebSocket temps réel backend → app
- [x] Store Zustand pour état des appels
- [x] Interface d'appel entrant (sonnerie, accepter/rejeter)
- [x] LiveKit client intégré (vidéo WebRTC)
- [x] Flow complet : Akuvox appelle → App affiche l'appel

### En cours
- [ ] Audio bidirectionnel (SDK Linphone natif iOS/Android)
- [ ] Vidéo RTSP de l'Akuvox (LiveKit Ingress)

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

## Phase 4 : Vidéo de l'Interphone

**Objectif** : Afficher la caméra de l'Akuvox dans l'app

### Tâches
- [ ] Configurer LiveKit Ingress
- [ ] Capturer stream RTSP de l'Akuvox
- [ ] Injecter dans LiveKit Room
- [ ] Afficher dans l'app (plein écran)

**Temps estimé** : 1-2 jours

---

## Timeline Globale

- **Semaine 1-2** : Audio bidirectionnel (Phase 3)
- **Semaine 3** : Vidéo RTSP (Phase 4)
- **Semaine 4-5** : Push notifications
- **Semaine 6-7** : Multi-tenant
- **Semaine 8-10** : Production

**Total : ~10 semaines jusqu'au MVP production-ready**
