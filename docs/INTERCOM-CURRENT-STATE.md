# État Actuel du Système Interphone SIP

> **Dernière mise à jour :** 15 janvier 2026

Ce document décrit l'état actuel de l'infrastructure SIP Neolia et les prochaines étapes pour le dashboard de gestion interphonie.

## Infrastructure Serveur

### VPS Kamailio (141.227.158.64)

| Composant | Statut | Version |
|-----------|--------|---------|
| Kamailio | ✅ Actif | 5.6.0 |
| RTPEngine | ✅ Actif | - |
| TLS/WSS | ✅ Configuré | Port 8443 |

**Accès SSH :**
```bash
ssh debian@141.227.158.64
```

**Configuration Kamailio :**
- Fichier principal : `/etc/kamailio/kamailio.cfg`
- Mode usrloc : Mémoire (db_mode=0) - **pas de persistance**
- Authentification : **NON CONFIGURÉE** (tout le monde peut s'enregistrer)
- Domaine : `sip.neolia.app`

**Ports ouverts :**
- 5060 UDP/TCP : SIP classique
- 5080 TCP : SIP secondaire
- 8443 TCP : WSS (WebSocket Secure)

### Modules activés

```
WITH_NAT        - NAT traversal
WITH_TLS        - Support TLS
WITH_WEBSOCKET  - WebSocket pour WebRTC
WITH_RTPENGINE  - Bridge RTP/WebRTC
```

### Configuration RTPEngine

RTPEngine gère automatiquement :
- **Client WebRTC (ws/wss)** : ICE + DTLS-SRTP activé
- **Client SIP classique (UDP/TCP)** : RTP simple

## État des comptes SIP

### Situation actuelle (mise a jour 15/01/2026)

Le serveur utilise maintenant l'authentification MySQL :
- ✅ Authentification activee (modules auth + auth_db)
- ✅ Base de donnees MySQL (table subscriber)
- ✅ Comptes SIP geres par le dashboard
- ✅ Enregistrements persistes en memoire

**Commande pour voir les enregistrements actifs :**
```bash
ssh debian@141.227.158.64 "sudo kamctl ul show"
```

**Commande pour lister les comptes SIP :**
```bash
ssh debian@141.227.158.64 "mysql -u kamailio -pKamailioSIP2024! kamailio -e 'SELECT username, domain FROM subscriber;'"
```

### Comptes SIP de test

| Username | Domain | Password | Usage |
|----------|--------|----------|-------|
| testuser | sip.neolia.app | test123 | Tests generaux |
| panel101 | sip.neolia.app | Panel2024! | Panel logement 101 |
| mobile101 | sip.neolia.app | Mobile2024! | App mobile logement 101 |

### Credentials MySQL

| User | Password | Database |
|------|----------|----------|
| root | Neolia2024! | - |
| kamailio | KamailioSIP2024! | kamailio |

## Code Frontend Existant

### Services SIP (`src/services/`)

| Fichier | Description |
|---------|-------------|
| `sipService.ts` | Client JsSIP pour navigateurs (WebSocket) |
| `linphoneSipService.ts` | Client natif Android (Linphone SDK) |
| `intercomService.ts` | Service haut niveau pour la gestion des appels |

### Stores Zustand (`src/store/`)

| Fichier | Description |
|---------|-------------|
| `useSIPConfigStore.ts` | Config SIP utilisateur (URI, password, WSS) |
| `usePanelIntercomStore.ts` | Config interphone pour panels |
| `intercomStore.ts` | État des appels en cours |

### Pages Test

| Route | Description |
|-------|-------------|
| `/intercom-test` | Test complet SIP + Vidéo Akuvox |
| `/admin` | Génération QR codes pour appairage HA |

### Composants UI

| Fichier | Description |
|---------|-------------|
| `SIPConfigDialog.tsx` | Dialog de config SIP manuelle |
| `IntercomSettingsCard.tsx` | Card de config pour panels |
| `AkuvoxVideoStream.tsx` | Affichage vidéo WHEP |

## Workflow Actuel (PWA)

```
1. Utilisateur configure SIP dans SIPConfigDialog
   - URI: sip:user@sip.neolia.app
   - Password: xxx
   - WSS: wss://sip.neolia.app:8443

2. sipService.init() initialise JsSIP
   - Connexion WebSocket vers Kamailio
   - Enregistrement SIP (REGISTER)

3. Akuvox appelle user@sip.neolia.app
   - Kamailio route vers le WebSocket du user
   - JsSIP déclenche événement 'newRTCSession'

4. Utilisateur accepte l'appel
   - Audio bidirectionnel via WebRTC
   - Vidéo via WHEP (MediaMTX sur R-Pi)
```

## Dashboard Interphonie - À Développer

### Objectif

Créer un dashboard web pour :
1. Gérer les **Sites** (immeubles)
2. Gérer les **Bâtiments** par site
3. Gérer les **Logements** par bâtiment
4. Créer/supprimer des **comptes SIP**
5. Configurer les **règles d'appel** (qui peut appeler qui)

### Structure de données proposée

```
Site
├── id
├── name
├── address
└── Buildings[]

Building
├── id
├── site_id
├── name (ex: "Bâtiment A")
└── Units[]

Unit
├── id
├── building_id
├── number (ex: "401")
├── sip_accounts[]
└── call_rules[]

SIPAccount
├── id
├── unit_id
├── username (ex: "unit401")
├── domain (ex: "sip.neolia.app")
├── password_hash
├── type (panel | mobile)
└── device_info

CallRule
├── id
├── unit_id
├── source_pattern (ex: "intercom-*")
├── action (ring | forward | voicemail)
└── target_sip_uri
```

### Actions prioritaires

1. **Ajouter auth à Kamailio** - Module auth_db + MySQL
2. **API Supabase** - CRUD Sites/Buildings/Units/SIPAccounts
3. **Dashboard React** - Interface de gestion admin
4. **Sync avec Kamailio** - Edge function pour créer/supprimer comptes

## Fichiers de référence

| Fichier | Contenu |
|---------|---------|
| `docs/API-CONTRACT.md` | Spec API REST complète |
| `docs/ARCHITECTURE.md` | Architecture globale |
| `docs/SIP-INTEGRATION.md` | Guide d'installation Kamailio |
| `docs/NEOLIA-REMOTE-MANAGEMENT.md` | Gestion remote Cloudflare |

## Credentials

> **IMPORTANT :** Ces credentials sont pour l'environnement de dev. En production, utiliser un vault securise.

**VPS Kamailio :**
- SSH : `debian@141.227.158.64`
- MySQL root : `Neolia2024!`
- MySQL kamailio : `KamailioSIP2024!`

**Kamailio Config :**
- Domaine : `sip.neolia.app`
- Port SIP : 5060 (UDP/TCP)
- Port WSS : 8443

## Statut des phases

### Phase 1 : Activer l'authentification Kamailio ✅ COMPLETE

- [x] Modules auth et auth_db charges
- [x] Base MySQL configuree
- [x] Table subscriber creee
- [x] Comptes de test crees
- [x] Kamailio redemarre avec succes

### Phase 2 : Dashboard Frontend ✅ COMPLETE

- [x] Page `/admin/intercom` creee
- [x] Onglets Sites/Batiments/Logements/SIP
- [x] Formulaires de creation
- [x] Bouton sync Kamailio

### Phase 3 : API Backend ✅ COMPLETE

- [x] Types TypeScript definis
- [x] Hook React Query (useIntercomAdmin)
- [x] Migration SQL Supabase
- [x] Edge Function kamailio-sync

## Prochaines etapes

### A faire

1. **Deployer la migration Supabase** :
   ```bash
   cd home-vista-luxe && supabase db push
   ```

2. **Deployer l'Edge Function** :
   ```bash
   supabase functions deploy kamailio-sync
   ```

3. **Configurer les secrets Supabase** :
   ```bash
   supabase secrets set KAMAILIO_HOST=141.227.158.64
   supabase secrets set KAMAILIO_DB_USER=kamailio
   supabase secrets set KAMAILIO_DB_PASS=KamailioSIP2024!
   ```

4. **Tester l'appel SIP de bout en bout** :
   - Configurer l'app avec panel101@sip.neolia.app
   - Verifier l'enregistrement sur Kamailio
   - Tester un appel depuis Akuvox

---

*Derniere mise a jour : 15 janvier 2026*
