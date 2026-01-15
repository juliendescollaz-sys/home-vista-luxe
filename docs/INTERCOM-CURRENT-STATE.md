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

### Situation actuelle

Le serveur utilise `usrloc` en mode mémoire (db_mode=0) :
- ❌ Pas de persistance des comptes
- ❌ Pas d'authentification (MODULE AUTH NON CHARGÉ)
- ✅ Enregistrements dynamiques en mémoire

**Commande pour voir les enregistrements actifs :**
```bash
ssh debian@141.227.158.64 "sudo kamctl ul show"
```

**Résultat actuel :** 0 enregistrements actifs (aucun client connecté)

### Problème identifié

Le serveur Kamailio n'a PAS le module `auth` et `auth_db` chargé. Cela signifie :
1. N'importe qui peut s'enregistrer avec n'importe quel nom
2. Pas de gestion de comptes utilisateurs
3. Impossible de lister les "comptes" car ils n'existent pas en DB

### Solution à implémenter

Pour avoir une gestion propre des comptes SIP :

1. **Activer l'authentification** dans Kamailio
2. **Utiliser une base de données** (MySQL ou SQLite)
3. **Créer une API** pour gérer les comptes depuis le dashboard

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

## Credentials (à documenter ailleurs)

> **IMPORTANT :** Les credentials réels doivent être stockés dans un vault sécurisé, pas dans le Git.

**VPS Kamailio :**
- SSH : `debian@141.227.158.64`
- DB Kamailio : `kamailio` / `Kampass2024!` (accès refusé actuellement - à fixer)

**Kamailio Config :**
- Domaine : `sip.neolia.app`
- Port WSS : 8443

## Prochaines étapes

### Phase 1 : Activer l'authentification Kamailio

```bash
# Sur le VPS
sudo nano /etc/kamailio/kamailio.cfg

# Ajouter :
loadmodule "auth.so"
loadmodule "auth_db.so"
modparam("auth_db", "db_url", "mysql://kamailio:xxx@localhost/kamailio")
modparam("auth_db", "calculate_ha1", yes)
modparam("auth_db", "password_column", "password")

# Dans route[REGISTRAR], ajouter avant save() :
if (!www_authenticate("sip.neolia.app", "subscriber")) {
    www_challenge("sip.neolia.app", "0");
    exit;
}
```

### Phase 2 : Dashboard Frontend

1. Créer page `/admin/intercom`
2. Composants : SitesList, BuildingsList, UnitsList
3. Forms : CreateSite, CreateBuilding, CreateUnit, CreateSIPAccount
4. Intégration API Supabase

### Phase 3 : API Backend

1. Edge functions Supabase pour CRUD
2. Fonction `sync-kamailio` pour créer comptes sur VPS
3. Webhook pour actions depuis le dashboard

---

*Document généré automatiquement - voir Git pour historique des modifications*
