# Neolia - TODO & Backlog Interphonie

*Mis à jour le : 1er janvier 2025*

---

## ✅ TERMINÉ RÉCEMMENT

### Vidéo Akuvox WebRTC Direct (Jan 2025)
- [x] **Infrastructure Raspberry Pi + MediaMTX**
  - Deployment Docker Compose (MediaMTX + API Config)
  - Configuration RTSP → WebRTC (WHEP)
  - Support IP DHCP dynamique

- [x] **Intégration Frontend React**
  - Service WebRTC (`akuvoxWebRTCService.ts`)
  - Hook React (`useAkuvoxVideo.ts`)
  - Store Zustand (`useMediaMTXConfigStore.ts`)
  - Composants UI (`AkuvoxVideoStream`, `MediaMTXConfigDialog`)
  - Page de test avec toggle LiveKit/Akuvox

- [x] **Modes de connexion**
  - Panel (LAN) : Connexion directe sans TURN
  - Mobile/Tablet (Remote) : Connexion via TURN server
  - Détection automatique du mode

- [x] **Documentation**
  - `docs/AKUVOX_INTEGRATION.md` complet
  - Mise à jour `ARCHITECTURE.md`
  - Mise à jour `ROADMAP.md`

---

## 🔥 PRIORITÉ IMMÉDIATE (Cette semaine)

### Audio Bidirectionnel
- [ ] **Intégrer Linphone SDK iOS**
  - Installer via CocoaPods
  - Créer plugin Capacitor Swift
  - Bridge : `registerSIP()`, `call()`, `answer()`, `hangup()`
  
- [ ] **Intégrer Linphone SDK Android**
  - Installer via Gradle
  - Créer plugin Capacitor Kotlin
  - Implémenter mêmes méthodes que iOS
  
- [ ] **Service TypeScript SIP**
  - Wrapper autour du plugin natif
  - Remplacer `sipService.ts` actuel (JsSIP)
  - Gestion événements (incoming call, connected, ended)

- [ ] **Tests audio**
  - Akuvox → App : audio clair
  - App → Akuvox : audio clair
  - Latence acceptable (<500ms)

**Temps estimé : 2-3 jours**

---

### ~~Vidéo RTSP de l'Akuvox~~ ✅ (REMPLACÉ PAR MEDIAMTX)

~~**Configurer LiveKit Ingress**~~ → **Remplacé par MediaMTX sur Raspberry Pi**

L'approche LiveKit Ingress a été remplacée par une solution MediaMTX offrant :
- Meilleure latence en mode Panel (pas de transit via VPS)
- Architecture distribuée (un Raspberry par immeuble)
- Support DHCP et configuration dynamique

Voir `docs/AKUVOX_INTEGRATION.md` pour détails.

---

### Intégration Audio SIP + Vidéo Akuvox (NOUVEAU)

- [ ] **Combiner les deux systèmes**
  - Audio : SIP via Linphone SDK (à venir)
  - Vidéo : WebRTC via MediaMTX (actif)
  - Synchroniser les deux flux

- [ ] **Tests combinés**
  - Latence audio + vidéo acceptable
  - Qualité suffisante
  - Pas de désynchronisation

**Temps estimé : 1 jour**

---

## 📋 BACKLOG (Prochaines semaines)

### Push Notifications & Sonnerie Native

- [ ] Firebase Cloud Messaging setup
- [ ] Backend envoie push lors d'appel SIP
- [ ] CallKit (iOS) pour appels natifs
- [ ] ConnectionService (Android) pour appels natifs
- [ ] Tester sonnerie type WhatsApp

**Temps estimé : 2-3 jours**

---

### Multi-tenant & Admin

- [ ] **Modèle BDD**
  - Table `projects` (immeubles)
  - Table `devices` (interphones, panels, mobiles)
  - Table `users` (locataires)
  - Table `call_rules` (groupes, fallback)

- [ ] **Génération config Asterisk dynamique**
  - Script Python génère `pjsip.conf` par projet
  - Contextes SIP isolés
  - Auto-reload Asterisk

- [ ] **Interface admin web**
  - CRUD projets
  - CRUD devices
  - Gestion règles d'appel
  - Logs des appels

**Temps estimé : 1 semaine**

---

### Ouverture Porte

- [ ] API backend `/api/door/unlock`
- [ ] Commande DTMF via Asterisk
- [ ] Bouton UI dans écran d'appel
- [ ] Log des ouvertures (sécurité)

**Temps estimé : 1 jour**

---

### Production & Monitoring

- [ ] **Monitoring**
  - UptimeRobot pour disponibilité
  - Sentry pour erreurs app
  - Logs centralisés (Loki ou équivalent)

- [ ] **Backups**
  - PostgreSQL backup automatique (daily)
  - Config Asterisk versionné Git
  - Plan de disaster recovery

- [ ] **Tests de charge**
  - 100 utilisateurs simultanés
  - 10 appels en même temps
  - Stress test Asterisk + LiveKit

- [ ] **Documentation utilisateur**
  - Guide installation app
  - Guide utilisation interphone
  - FAQ dépannage

**Temps estimé : 1 semaine**

---

## 🐛 BUGS CONNUS

### Critiques
- [x] ~~WebSocket reconnexion en boucle~~ → **RÉSOLU** (problème Lovable preview)
- [x] ~~TLS handshake EOF avec Home Assistant~~ → **RÉSOLU** (retry logic améliorée - Jan 2025)
- [ ] JsSIP `navigator.mediaDevices.getUserMedia` undefined → **À remplacer par SDK natif**

### Mineurs
- [ ] Cadre vidéo locale vide affiché (à cacher car inutile)
- [ ] Logs backend pollués par bots scanners (à filtrer)

### Améliorations MediaMTX (Basse priorité)
- [ ] Découverte automatique IP Raspberry Pi (mDNS)
- [ ] Fallback LiveKit si MediaMTX indisponible
- [ ] Métriques qualité vidéo (bitrate, latence, frame drops)

---

## 📝 NOTES TECHNIQUES

### Décisions Importantes

**Pourquoi Asterisk + LiveKit au lieu de tout LiveKit ?**
- LiveKit SIP ne gère pas les REGISTER SIP
- Asterisk est le standard industriel pour SIP
- LiveKit excellent pour WebRTC vidéo
- Meilleure séparation des responsabilités

**Pourquoi SDK natif au lieu de JsSIP ?**
- JsSIP a des limitations sur mobile (mediaDevices, NAT)
- SDK natif = CallKit/ConnectionService natif
- Meilleure stabilité et performance
- Sonnerie native type WhatsApp

**~~Pourquoi LiveKit Ingress pour RTSP ?~~** → **Remplacé par MediaMTX**
- ~~Pas de conversion manuelle RTSP→WebRTC~~
- ~~Géré par LiveKit (scalable, optimisé)~~
- ~~Même room pour audio + vidéo~~

**Pourquoi MediaMTX au lieu de LiveKit Ingress ?**
- Conversion RTSP→WebRTC locale (Raspberry Pi)
- Latence réduite en mode Panel (pas de transit VPS)
- Architecture distribuée : un Raspberry par immeuble
- Protocole WHEP standard (pas de dépendance LiveKit)
- Coût réduit (pas de bande passante VPS pour vidéo)
- Configuration dynamique via API

---

## 📊 Métriques Objectifs MVP

- **Latence audio** : <500ms
- **Latence vidéo** : <1s
- **Disponibilité** : >99.5%
- **Temps réponse appel** : <3s (sonnerie → affichage)
- **Qualité vidéo** : 720p minimum
- **Utilisateurs simultanés** : 100+

---

## 🔄 Prochaine Session

**Objectif** : Tester intégration Akuvox WebRTC + préparer audio SIP

**Tests à effectuer** :
1. **Mode Panel (LAN)** :
   - [ ] Configurer IP Raspberry Pi dans l'app
   - [ ] Tester connexion WebRTC directe
   - [ ] Vérifier qualité vidéo et latence
   - [ ] Valider que TURN n'est pas utilisé

2. **Mode Mobile (TURN)** :
   - [ ] Tester en 4G/5G (pas sur même LAN)
   - [ ] Vérifier connexion via TURN relay
   - [ ] Mesurer latence avec TURN
   - [ ] Tester sur différents opérateurs

3. **Préparer Linphone SDK** :
   - [ ] Installer Xcode
   - [ ] Installer Android Studio
   - [ ] Installer CocoaPods
   - [ ] Vérifier compte Apple Developer

**Documentation à consulter** :
- `docs/AKUVOX_INTEGRATION.md` : Guide complet MediaMTX
- `docs/ARCHITECTURE.md` : Architecture mise à jour
- `docs/ROADMAP.md` : Phases suivantes
