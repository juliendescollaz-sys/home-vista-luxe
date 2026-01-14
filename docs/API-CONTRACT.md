# Neolia Dashboard - Contrat API

Ce document définit l'interface entre le **Dashboard UI** (frontend React) et le **Backend** (Supabase).

> **Règle d'or** : Le frontend ne connaît QUE cette API. Il ne sait pas comment le backend stocke ou traite les données.

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   DASHBOARD UI      │         │   BACKEND           │
│   (React)           │         │   (Supabase)        │
│                     │         │                     │
│   /sites            │◀───────▶│   /rest/v1/sites    │
│   /devices          │   API   │   /rest/v1/devices  │
│   /sip-accounts     │  REST   │   /rest/v1/sip_*    │
│   /monitoring       │         │   /rest/v1/logs     │
└─────────────────────┘         └─────────────────────┘
```

---

## Base URL

```
Production : https://your-project.supabase.co/rest/v1
Headers requis :
  - apikey: <SUPABASE_ANON_KEY>
  - Authorization: Bearer <USER_JWT>
  - Content-Type: application/json
```

---

## 1. Authentification

### POST /auth/v1/token?grant_type=password
Login utilisateur dashboard.

**Request:**
```json
{
  "email": "admin@neolia.app",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "abc123...",
  "user": {
    "id": "uuid",
    "email": "admin@neolia.app",
    "role": "admin"
  }
}
```

---

## 2. Sites (Projets/Bâtiments)

### GET /rest/v1/sites
Liste tous les sites accessibles à l'utilisateur.

**Query params:**
- `select` : Champs à retourner (default: `*`)
- `status` : Filtrer par status (`online`, `partial`, `offline`)
- `order` : Tri (`name.asc`, `created_at.desc`)
- `limit` : Pagination
- `offset` : Pagination

**Response 200:**
```json
[
  {
    "id": "uuid-site-1",
    "name": "Villa Montagne",
    "address": "123 Rue des Alpes, 74000 Annecy",
    "type": "villa",
    "status": "online",
    "timezone": "Europe/Paris",
    "created_at": "2025-01-10T10:00:00Z",
    "updated_at": "2025-01-14T12:00:00Z",
    "stats": {
      "devices_total": 5,
      "devices_online": 4,
      "sip_accounts": 3
    }
  }
]
```

### GET /rest/v1/sites?id=eq.{siteId}
Détail d'un site.

### POST /rest/v1/sites
Créer un nouveau site.

**Request:**
```json
{
  "name": "Résidence Les Cimes",
  "address": "456 Avenue du Mont-Blanc",
  "type": "building",
  "timezone": "Europe/Paris"
}
```

**Response 201:**
```json
{
  "id": "uuid-new-site",
  "name": "Résidence Les Cimes",
  ...
}
```

### PATCH /rest/v1/sites?id=eq.{siteId}
Modifier un site.

### DELETE /rest/v1/sites?id=eq.{siteId}
Supprimer un site (soft delete recommandé).

---

## 3. Devices (Appareils)

### GET /rest/v1/devices?site_id=eq.{siteId}
Liste les appareils d'un site.

**Response 200:**
```json
[
  {
    "id": "uuid-device-1",
    "site_id": "uuid-site-1",
    "zone_id": "uuid-zone-1",
    "name": "Panel Entrée",
    "type": "panel",
    "model": "Akuvox S563",
    "ip_address": "192.168.1.100",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "firmware_version": "563.30.1.28",
    "status": "online",
    "last_seen": "2025-01-14T14:30:00Z",
    "config": {
      "sip_account_id": "uuid-sip-1",
      "rtsp_enabled": true
    }
  },
  {
    "id": "uuid-device-2",
    "site_id": "uuid-site-1",
    "name": "Interphone Portail",
    "type": "intercom",
    "model": "Akuvox E12W",
    "status": "online",
    ...
  },
  {
    "id": "uuid-device-3",
    "site_id": "uuid-site-1",
    "name": "Gateway R-Pi",
    "type": "gateway",
    "model": "Raspberry Pi 4",
    "status": "online",
    "system_metrics": {
      "cpu_percent": 15.2,
      "memory_percent": 45.8,
      "disk_percent": 32.1,
      "temperature": 52.3
    },
    "services": {
      "mediamtx": "running",
      "asterisk": "running",
      "cloudflared": "running"
    }
  }
]
```

### POST /rest/v1/devices
Ajouter un appareil.

### PATCH /rest/v1/devices?id=eq.{deviceId}
Modifier un appareil.

### DELETE /rest/v1/devices?id=eq.{deviceId}
Supprimer un appareil.

---

## 4. Zones (Structure hiérarchique)

### GET /rest/v1/zones?site_id=eq.{siteId}
Liste les zones d'un site.

**Response 200:**
```json
[
  {
    "id": "uuid-zone-1",
    "site_id": "uuid-site-1",
    "parent_id": null,
    "name": "Entrée Principale",
    "type": "entrance",
    "floor": 0,
    "order": 1
  },
  {
    "id": "uuid-zone-2",
    "site_id": "uuid-site-1",
    "parent_id": "uuid-zone-1",
    "name": "Appartement 101",
    "type": "unit",
    "floor": 1,
    "order": 1
  }
]
```

---

## 5. Comptes SIP

### GET /rest/v1/sip_accounts?site_id=eq.{siteId}
Liste les comptes SIP d'un site.

**Response 200:**
```json
[
  {
    "id": "uuid-sip-1",
    "site_id": "uuid-site-1",
    "device_id": "uuid-device-1",
    "username": "panel_101",
    "extension": "101",
    "display_name": "Appartement 101",
    "sip_server": "sip.neolia.app",
    "transport": "udp",
    "enabled": true,
    "registered": true,
    "last_registration": "2025-01-14T14:00:00Z"
  }
]
```

### POST /rest/v1/sip_accounts
Créer un compte SIP.

**Request:**
```json
{
  "site_id": "uuid-site-1",
  "device_id": "uuid-device-1",
  "username": "panel_102",
  "password": "auto-generated-or-provided",
  "extension": "102",
  "display_name": "Appartement 102"
}
```

### PATCH /rest/v1/sip_accounts?id=eq.{sipId}
Modifier (enable/disable, changer password).

### DELETE /rest/v1/sip_accounts?id=eq.{sipId}
Supprimer un compte SIP.

---

## 6. Logs d'activité

### GET /rest/v1/activity_logs?site_id=eq.{siteId}
Liste les logs d'un site.

**Query params:**
- `level` : `info`, `success`, `warning`, `error`
- `device_id` : Filtrer par appareil
- `created_at` : Filtrer par date (`gte.2025-01-14`)
- `order` : `created_at.desc`
- `limit` : Pagination (default: 50)

**Response 200:**
```json
[
  {
    "id": "uuid-log-1",
    "site_id": "uuid-site-1",
    "device_id": "uuid-device-1",
    "level": "info",
    "action": "device.connected",
    "message": "Panel Entrée connecté",
    "metadata": {
      "ip": "192.168.1.100",
      "firmware": "563.30.1.28"
    },
    "created_at": "2025-01-14T14:30:00Z"
  }
]
```

---

## 7. Déploiement de configuration

### POST /rest/v1/rpc/deploy_config
Déployer une configuration vers un ou plusieurs appareils.

**Request:**
```json
{
  "device_ids": ["uuid-device-1", "uuid-device-2"],
  "config_type": "sip",
  "config": {
    "sip_server": "sip.neolia.app",
    "sip_port": 5060,
    "transport": "udp"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "deployed_count": 2,
  "results": [
    { "device_id": "uuid-device-1", "status": "success" },
    { "device_id": "uuid-device-2", "status": "success" }
  ]
}
```

### POST /rest/v1/rpc/deploy_apk
Déployer une mise à jour APK.

**Request:**
```json
{
  "device_ids": ["uuid-device-1"],
  "apk_url": "https://storage.neolia.app/releases/panel-1.2.0.apk",
  "version": "1.2.0"
}
```

---

## 8. Temps réel (WebSocket)

### Supabase Realtime
Écouter les changements en temps réel.

```javascript
// Frontend
const subscription = supabase
  .channel('devices')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'devices' },
    (payload) => {
      console.log('Device changed:', payload)
    }
  )
  .subscribe()
```

**Events:**
- `INSERT` : Nouvel appareil ajouté
- `UPDATE` : Status changé, last_seen mis à jour
- `DELETE` : Appareil supprimé

---

## 9. Dashboard Stats

### GET /rest/v1/rpc/get_dashboard_stats
Statistiques globales pour le dashboard.

**Response 200:**
```json
{
  "sites_total": 12,
  "sites_online": 10,
  "sites_partial": 1,
  "sites_offline": 1,
  "devices_total": 45,
  "devices_online": 42,
  "sip_accounts_total": 38,
  "sip_accounts_registered": 35,
  "alerts_count": 3
}
```

---

## Codes d'erreur

| Code | Signification |
|------|---------------|
| 200 | OK |
| 201 | Créé |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé (RLS) |
| 404 | Ressource non trouvée |
| 409 | Conflit (doublon) |
| 500 | Erreur serveur |

**Format erreur:**
```json
{
  "error": "invalid_request",
  "message": "Le champ 'name' est requis",
  "details": { "field": "name" }
}
```

---

## Row Level Security (RLS)

Toutes les tables utilisent RLS pour isoler les données par utilisateur/organisation.

**Règles:**
- Un utilisateur ne voit que les sites de son organisation
- Un admin peut voir/modifier tous les sites de son org
- Un installateur peut ajouter des devices mais pas supprimer

---

## Versioning

L'API est versionnée via le chemin : `/rest/v1/`

Les breaking changes incrémenteront la version (`/rest/v2/`).

---

## SDK Frontend

Le dashboard utilise le client Supabase JS :

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Exemple: Liste des sites
const { data: sites, error } = await supabase
  .from('sites')
  .select('*')
  .order('name')
```

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-01-14 | Version initiale |
