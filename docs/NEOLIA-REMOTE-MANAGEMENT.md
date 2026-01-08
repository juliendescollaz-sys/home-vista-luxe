# Neolia Remote Management Architecture

## Vue d'ensemble

Architecture pour gérer à distance les panels S563, intercoms Akuvox et R-Pi installés sur les sites clients, sans VPN et sans ouvrir de ports.

## Architecture globale

```
+---------------------------------------------------------------------+
|                      DASHBOARD NEOLIA (web)                         |
|                                                                     |
|  - Liste des sites/panels                                           |
|  - Upload nouvelle version APK                                      |
|  - Accès aux interfaces web des devices                             |
|  - Monitoring et logs                                               |
+----------------------------------+----------------------------------+
                                   |
                                   | HTTPS (Cloudflare)
                                   |
+----------------------------------v----------------------------------+
|                     CLOUDFLARE ZERO TRUST                          |
|                                                                     |
|  +-------------+  +-------------+  +-------------+                  |
|  | Tunnel      |  | Tunnel      |  | Tunnel      |  ... (1000 max) |
|  | site-A      |  | site-B      |  | site-C      |                  |
|  +-------------+  +-------------+  +-------------+                  |
|                                                                     |
|  Cloudflare Access: authentification (50 users gratuits)            |
+---------------------------------------------------------------------+
         |                    |                    |
         | (sortant)          | (sortant)          | (sortant)
         v                    v                    v
+---------------+    +---------------+    +---------------+
|   R-Pi        |    |   R-Pi        |    |   R-Pi        |
|   Site A      |    |   Site B      |    |   Site C      |
|               |    |               |    |               |
| - cloudflared |    | - cloudflared |    | - cloudflared |
| - MediaMTX    |    | - MediaMTX    |    | - MediaMTX    |
| - Asterisk    |    | - Asterisk    |    | - Asterisk    |
| - Agent       |    | - Agent       |    | - Agent       |
|   Neolia      |    |   Neolia      |    |   Neolia      |
+-------+-------+    +-------+-------+    +-------+-------+
        |                    |                    |
        | LAN                | LAN                | LAN
        v                    v                    v
+---------------+    +---------------+    +---------------+
| Panel S563    |    | Panel S563    |    | Panel S563    |
| Akuvox E12W   |    | Akuvox E12W   |    | Akuvox E12W   |
+---------------+    +---------------+    +---------------+
```

## Composants

### 1. Cloudflare Zero Trust (gratuit)

| Limite plan gratuit | Valeur |
|---------------------|--------|
| Users (personnes)   | 50     |
| Tunnels (R-Pi)      | 1000   |
| Access Applications | 500    |
| Bande passante      | Illimitee |

**Note**: Un "user" = une personne qui s'authentifie, PAS un R-Pi. Les tunnels sont illimites (jusqu'a 1000).

### 2. R-Pi Gateway (par site)

Chaque R-Pi heberge :

- **cloudflared** : Tunnel sortant vers Cloudflare
- **MediaMTX** : Conversion RTSP -> HLS/WebRTC pour la video interphone
- **Asterisk** : Serveur SIP local pour les appels interphone
- **Agent Neolia** : Service leger pour executer les commandes distantes

### 3. Agent Neolia

Service Python/Go leger qui :
- Se connecte au dashboard central (WebSocket ou polling)
- Execute les commandes recues (update APK, config, restart)
- Reporte le status des devices LAN
- Proxy les requetes HTTP vers les devices LAN

### 4. Panel S563

- Interface web sur port 80 (LAN uniquement)
- Upload APK via `Phone > APP` ou `Device > Third-Party APK`
- Configuration auto-start de l'app Neolia
- CPU: ARMv7a

### 5. Interphone Akuvox

- Interface web pour configuration SIP
- Modification des users SIP sans passer par le cloud Akuvox
- Accessible via le tunnel Cloudflare

## Configuration Cloudflare Tunnel

### Installation sur R-Pi

```bash
# Telecharger cloudflared pour ARM64
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

# Login (ouvre un navigateur ou donne un lien)
cloudflared tunnel login

# Creer un tunnel pour ce site
cloudflared tunnel create site-dupont

# Le tunnel ID et credentials sont sauvegardes dans ~/.cloudflared/
```

### Configuration du tunnel

```yaml
# /etc/cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  # SSH pour administration
  - hostname: ssh-dupont.neolia.app
    service: ssh://localhost:22

  # Interface web Panel S563
  - hostname: panel-dupont.neolia.app
    service: http://192.168.1.50:80

  # Interface web Akuvox E12W
  - hostname: intercom-dupont.neolia.app
    service: http://192.168.1.10:80

  # API MediaMTX
  - hostname: media-dupont.neolia.app
    service: http://localhost:9997

  # Agent Neolia API
  - hostname: agent-dupont.neolia.app
    service: http://localhost:8091

  # Fallback
  - service: http_status:404
```

### Service systemd

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Workflow de deploiement APK

```
+------------------+     +------------------+     +------------------+
|    Dashboard     |     |      R-Pi        |     |    Panel S563    |
|     Neolia       |     |    (Agent)       |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         | 1. Upload APK          |                        |
         | 2. Select sites        |                        |
         | 3. Click "Deploy"      |                        |
         |                        |                        |
         | ---- WebSocket ------> |                        |
         |    {cmd: "deploy",     |                        |
         |     apk_url: "..."}    |                        |
         |                        |                        |
         |                        | 4. Download APK        |
         |                        |    from central        |
         |                        |                        |
         |                        | 5. POST APK to panel   |
         |                        | ---------------------->|
         |                        |    multipart/form-data |
         |                        |                        |
         |                        |                        | 6. Install APK
         |                        |                        |
         |                        | <-- 200 OK ----------- |
         |                        |                        |
         | <-- status: success -- |                        |
         |                        |                        |
```

## Securite

### Cloudflare Access

Tous les endpoints sont proteges par Cloudflare Access :
- Authentification requise (email, Google, GitHub...)
- Logs de tous les acces
- Policies par application/groupe

### Agent Neolia

- Authentification par token unique par site
- Communication chiffree (HTTPS/WSS)
- Whitelist des commandes autorisees

## Capacites du dashboard

| Action | Methode |
|--------|---------|
| Deployer APK sur panels | Agent -> POST HTTP vers panel web |
| Acceder config Akuvox | Tunnel -> proxy HTTP vers intercom |
| Acceder config Panel | Tunnel -> proxy HTTP vers panel |
| SSH sur R-Pi | Tunnel -> SSH direct |
| Voir logs MediaMTX | Tunnel -> API MediaMTX |
| Voir logs Asterisk | Agent -> commande locale |
| Reboot services | Agent -> systemctl |
| Scanner devices LAN | Agent -> nmap/arp |

## API Panel S563 (Reverse-Engineering)

### Authentification

Le panel S563 utilise une authentification par token via l'API JSON.

**Endpoint Login:** `POST https://<panel_ip>/api`

**Request:**
```json
{
  "target": "login",
  "action": "login",
  "data": "{\"userName\":\"admin\",\"password\":\"<MD5_HASH>\",\"rand\":\"<RANDOM_128_HEX>\"}",
  "session": ""
}
```

**Notes:**
- Le `password` est hashe en **MD5** (32 caracteres hex)
- Le `rand` est un nonce aleatoire de 128 caracteres hex (genere cote client)
- Le champ `data` est une **string JSON encodee**, pas un objet

**Response:**
```json
{
  "retcode": 0,
  "action": "login",
  "message": "OK",
  "data": {
    "isFirstLogin": 0,
    "aesKey": "...",
    "token": "<TOKEN_128_HEX>",
    "userType": "admin"
  }
}
```

Le token doit ensuite etre fourni dans:
- Header `authorization`
- Cookie `httpsToken`

### Upload APK

**Endpoint:** `POST https://<panel_ip>/api/phoneApp/upload`

**Headers:**
```
authorization: <token>
content-type: multipart/form-data
```

**Cookies:**
```
httpsToken=<token>
```

**Body:** `multipart/form-data` avec le fichier APK dans le champ `file`

**Exemple curl:**
```bash
curl 'https://192.168.1.23/api/phoneApp/upload' \
  -H 'authorization: 393775BC...' \
  -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary...' \
  -b 'httpsToken=393775BC...' \
  -F 'file=@app-release.apk;type=application/vnd.android.package-archive' \
  --insecure
```

**Notes:**
- Le certificat SSL est auto-signe, donc `--insecure` est necessaire
- Le token expire apres un certain temps (a determiner)
- Le fichier APK doit avoir le MIME type `application/vnd.android.package-archive`

### Script d'upload automatise

Un script Python est disponible dans `tools/s563-apk-uploader.py`:

```bash
# Installation des dependances
pip install requests

# Upload avec credentials
python tools/s563-apk-uploader.py \
  --ip 192.168.1.23 \
  --user admin \
  --password admin123 \
  --apk app-release.apk

# Upload avec token manuel (recupere depuis le navigateur)
python tools/s563-apk-uploader.py \
  --ip 192.168.1.23 \
  --token 393775BC... \
  --apk app-release.apk
```

### Autres endpoints potentiels (a explorer)

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/api/phoneApp/list` | GET | Liste des apps installees |
| `/api/phoneApp/uninstall` | POST | Desinstaller une app |
| `/api/phoneApp/start` | POST | Demarrer une app |
| `/api/system/reboot` | POST | Redemarrer le panel |
| `/api/system/info` | GET | Infos systeme |

## Prochaines etapes

1. [x] Reverse-engineering de l'upload APK sur S563
2. [x] Identifier l'endpoint de login pour automatiser l'auth
3. [ ] Tester le script d'upload sur un panel reel
4. [ ] Setup Cloudflare Zero Trust + premier tunnel
5. [ ] Developper l'Agent Neolia (MVP)
6. [ ] Developper le Dashboard Neolia (MVP)
7. [ ] Tests sur site pilote

## References

- [Cloudflare Zero Trust Pricing](https://www.cloudflare.com/plans/zero-trust-services/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Akuvox S563 Third-Party Apps](https://knowledge.akuvox.com/docs/install-and-configure-third-party-apps-on-indoor-monitors)
- [Akuvox HTTP API](https://knowledge.akuvox.com/docs/device-integration-with-third-party-1)
