# Neolia - TODO & Backlog Interphonie

*Mis à jour le : 29 décembre 2024*

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

### Vidéo RTSP de l'Akuvox

- [ ] **Configurer LiveKit Ingress**
  - Créer Ingress via API LiveKit
  - URL source : `rtsp://[IP_AKUVOX]/video1`
  - Codec : H.264
  - Injecter dans room lors de l'appel

- [ ] **Modifier webhook backend**
  - Créer Ingress lors de l'appel
  - Associer à la room LiveKit
  - Cleanup après fin d'appel

- [ ] **Tester vidéo**
  - Akuvox stream visible dans app
  - Latence acceptable (<1s)
  - Qualité suffisante

**Temps estimé : 1-2 jours**

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
- [ ] JsSIP `navigator.mediaDevices.getUserMedia` undefined → **À remplacer par SDK natif**

### Mineurs
- [ ] Cadre vidéo locale vide affiché (à cacher car inutile)
- [ ] Logs backend pollués par bots scanners (à filtrer)

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

**Pourquoi LiveKit Ingress pour RTSP ?**
- Pas de conversion manuelle RTSP→WebRTC
- Géré par LiveKit (scalable, optimisé)
- Même room pour audio + vidéo

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

**Objectif** : Commencer intégration Linphone SDK

**Étape 1** : Setup iOS
1. Installer CocoaPods dans le projet
2. Ajouter `pod 'linphone-sdk'`
3. Créer plugin Capacitor basique
4. Tester enregistrement SIP

**Préparation** :
- Avoir Xcode installé
- Compte Apple Developer (pour build iOS)
- Android Studio (pour build Android)
