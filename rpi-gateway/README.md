# Neolia Gateway (Raspberry Pi)

Gateway local pour l'interphonie Neolia. Gere la connexion SIP entre l'interphone Akuvox et les panels Android.

## Architecture

```
┌─────────────────┐     SIP      ┌─────────────────┐     SIP      ┌─────────────────┐
│  Akuvox E12W    │─────────────▶│  R-Pi Gateway   │◀─────────────│  Panel Android  │
│  (Interphone)   │              │  (Asterisk)     │              │  (Linphone SDK) │
└─────────────────┘              └─────────────────┘              └─────────────────┘
        │                                │
        │ RTSP                          │ WHEP
        ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│  Video H.264    │─────────────▶│    MediaMTX     │─────────────▶ Panel (video)
└─────────────────┘              └─────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Asterisk | 5060/UDP | Serveur SIP |
| MediaMTX | 8889 | WebRTC WHEP (video) |
| API | 8080 | Configuration & appairage |
| Avahi | 5353 | mDNS discovery |

## Installation

### Prerequis
- Raspberry Pi 4 (recommande) ou Pi 3B+
- Raspberry Pi OS Lite (64-bit)
- Connexion reseau LAN

### Installation rapide

```bash
# Sur le Raspberry Pi
sudo apt update && sudo apt install -y git
git clone https://github.com/votre-repo/home-vista-luxe.git
cd home-vista-luxe/rpi-gateway
chmod +x install.sh
sudo ./install.sh
```

### Installation manuelle

```bash
# 1. Installer Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Installer Avahi
sudo apt install -y avahi-daemon

# 3. Copier les fichiers
sudo mkdir -p /opt/neolia-gateway
sudo cp -r * /opt/neolia-gateway/
cd /opt/neolia-gateway

# 4. Demarrer
docker-compose up -d
```

## Configuration

### Akuvox E12W

Configurer l'Akuvox pour s'enregistrer sur le R-Pi:

1. **SIP Settings**
   - SIP Server: `{IP du R-Pi}`
   - SIP Port: `5060`
   - SIP User: `100`
   - SIP Password: `akuvox2024`
   - Transport: `UDP`

2. **Address Book**
   - Importer le carnet d'adresses genere par l'API
   - Chaque bouton appelle le numero d'appartement (ex: 401)

### Panels

#### Appairage par PIN (recommande)

1. L'installateur genere un PIN via l'API:
   ```bash
   curl -X POST http://neolia-gateway.local:8080/pins \
     -H "Content-Type: application/json" \
     -d '{"apartment_id": "401"}'
   ```
   Reponse: `{"pin": "123456", "apartment_id": "401", "expires_at": "..."}`

2. Sur le panel, entrer le PIN dans les parametres interphone
3. Le panel recoit automatiquement sa configuration SIP

#### Configuration manuelle

Dans l'app Panel > Parametres > Interphone > Configurer:
- Serveur: `{IP du R-Pi}` ou `neolia-gateway.local`
- Identifiant: `panel-401`
- Mot de passe: `{genere par l'API}`

## API Endpoints

### Discovery
```
GET /
GET /discover
```
Retourne les infos du gateway (IP, ports).

### Appairage
```
POST /pins
Body: {"apartment_id": "401"}
```
Genere un PIN (valide 30 min).

```
POST /pair
Body: {"pin": "123456"}
```
Appaire un panel, retourne la config complete.

### Gestion panels
```
GET /panels              # Liste des panels
POST /panels             # Creer un panel
DELETE /panels/{id}      # Supprimer un panel
```

### Config Akuvox
```
GET /akuvox/config
```
Retourne la config et le carnet d'adresses pour l'Akuvox.

## Flux d'appel

1. Visiteur appuie sur bouton "401" de l'Akuvox
2. Akuvox envoie `INVITE sip:401@{rpi}` a Asterisk
3. Asterisk route vers `panel-401` via le dialplan
4. Panel recoit l'appel, affiche l'overlay plein ecran
5. Panel se connecte a MediaMTX pour la video WHEP
6. Utilisateur repond, audio SIP bidirectionnel
7. Utilisateur appuie "Ouvrir", panel envoie DTMF "#"
8. Akuvox recoit le DTMF et ouvre la porte

## Troubleshooting

### Verifier les services
```bash
docker-compose ps
docker-compose logs asterisk
docker-compose logs mediamtx
```

### Tester SIP
```bash
# Verifier enregistrements
docker exec asterisk asterisk -rx "pjsip show endpoints"
docker exec asterisk asterisk -rx "pjsip show registrations"
```

### Tester video
```bash
# Verifier le flux RTSP
curl http://localhost:8889/akuvox/whep
```

### Logs en temps reel
```bash
docker-compose logs -f
```

## Fichiers

```
rpi-gateway/
├── docker-compose.yml      # Orchestration services
├── install.sh              # Script installation
├── README.md               # Cette documentation
├── asterisk/
│   ├── pjsip.conf         # Config SIP (endpoints, auth)
│   ├── extensions.conf    # Dialplan (routage appels)
│   ├── rtp.conf           # Config RTP
│   ├── asterisk.conf      # Config generale
│   └── logger.conf        # Logs
├── mediamtx/
│   └── mediamtx.yml       # Config RTSP -> WebRTC
├── avahi/
│   └── neolia.service     # Service mDNS
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py            # API FastAPI
└── data/
    ├── panels.json        # Panels configures
    └── pins.json          # PINs actifs
```

## Securite

- Le gateway est prevu pour fonctionner uniquement en LAN
- Les mots de passe SIP sont generes aleatoirement
- Les PINs expirent apres 30 minutes
- Pas d'exposition sur Internet
