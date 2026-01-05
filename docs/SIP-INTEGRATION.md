# Intégration SIP Akuvox E12W

Ce document explique comment configurer et tester la réception d'appels SIP depuis l'Akuvox E12W vers l'application Home Vista Luxe.

## Architecture

### Vue d'ensemble

```
┌─────────────────┐                   ┌──────────────┐                   ┌────────────────┐
│  Akuvox E12W    │ ──── SIP ────────>│  Kamailio    │ ───── WSS ───────>│  iPhone/Panel  │
│  (Interphone)   │                   │  (VPS Proxy) │                   │  (App React)   │
└─────────────────┘                   └──────────────┘                   └────────────────┘
                                             │
                                             │ SIP Trunk (si N100)
                                             v
                                      ┌──────────────┐
                                      │  Asterisk    │
                                      │  (N100)      │
                                      └──────────────┘
```

### Flux audio et vidéo

**Audio (SIP):**
- Akuvox → Kamailio VPS → iPhone/Panel
- Bidirectionnel via WebRTC (SIP over WebSocket)
- Géré par `sipService.ts` + JsSIP

**Vidéo (WHEP):**
- Akuvox RTSP → MediaMTX (R-Pi) → WebRTC WHEP → iPhone/Panel
- Unidirectionnel (réception seulement)
- Géré par `akuvoxWebRTCService.ts`

## Installation Kamailio sur le VPS

### Prérequis

- VPS Debian/Ubuntu avec accès root
- IP publique: 141.227.158.64
- Domaine pointant vers le VPS: sip.neolia.app
- Ports ouverts: 5060 (UDP/TCP), 5080 (TCP), 8443 (TCP)

### Script d'installation

```bash
# Se connecter au VPS
ssh root@141.227.158.64

# Télécharger le script d'installation
cd /root
curl -O https://raw.githubusercontent.com/.../install-kamailio-vps.sh
# OU copier le fichier scripts/install-kamailio-vps.sh

# Éditer le script pour remplacer le domaine
nano install-kamailio-vps.sh
# Remplacer "neolia-sip.com" par ton vrai domaine

# Exécuter l'installation
chmod +x install-kamailio-vps.sh
sudo bash install-kamailio-vps.sh
```

L'installation prend environ 10-15 minutes et configure automatiquement :
- Kamailio 5.7 avec modules MySQL, WebSocket, TLS
- Base de données MySQL pour les utilisateurs
- Certificats TLS Let's Encrypt
- Nginx comme reverse proxy pour WSS
- Firewall (ufw)

### Vérification de l'installation

```bash
# Vérifier le statut de Kamailio
systemctl status kamailio

# Vérifier les enregistrements actifs
kamctl ul show

# Vérifier les logs
tail -f /var/log/syslog | grep kamailio
```

## Configuration utilisateurs SIP

### Créer un utilisateur

```bash
# Format: kamctl add user@domain password
kamctl add julien@neolia-sip.com MonMotDePasse123

# Lister tous les utilisateurs
kamctl db show subscriber
```

### Supprimer un utilisateur

```bash
kamctl rm julien@neolia-sip.com
```

### Générer un code QR (TODO)

Pour les projets futurs, un système de QR code sera implémenté pour distribuer automatiquement les credentials SIP aux utilisateurs.

## Configuration de l'application

### 1. Configurer les identifiants SIP

Dans l'app Home Vista Luxe :

1. Aller sur `/intercom-test`
2. Cliquer sur l'icône Settings (engrenage) à côté de "Test Interphone Vidéo"
3. Remplir le formulaire :
   - **URI SIP**: `sip:julien@sip.neolia.app`
   - **Mot de passe**: Le mot de passe créé avec `kamctl add`
   - **Serveur WebSocket**: `wss://sip.neolia.app:8443`
   - **Nom d'affichage**: `Julien`
4. Cliquer sur "Sauvegarder"

L'app va se recharger et se connecter automatiquement au serveur Kamailio.

### 2. Vérifier la connexion SIP

Dans l'UI, tu verras une carte "Statut SIP" avec :
- **Vert "SIP Connecté"** : Prêt à recevoir des appels
- **Jaune "SIP Non Configuré"** : Credentials manquants
- **Gris "SIP Déconnecté"** : Erreur de connexion

### 3. Logs de debug

Ouvre la console du navigateur (F12) pour voir les logs :
```
🔌 Initializing SIP service with config
✅ SIP WebSocket connected
✅ SIP Registered
```

## Configuration de l'Akuvox E12W

### Accéder à l'interface web

1. Trouver l'IP de l'Akuvox sur le réseau local
2. Ouvrir `http://[IP_AKUVOX]` dans un navigateur
3. Se connecter avec les credentials admin

### Configurer le compte SIP

**Menu : Settings → Network → SIP**

```
Account 1:
  Enable: ON
  Account Name: Akuvox E12W
  SIP Server: neolia-sip.com (ou 141.227.158.64)
  SIP User ID: akuvox
  Authenticate ID: akuvox
  Authenticate Password: [mot de passe créé avec kamctl]
  Display Name: Interphone Entrée

Transport: UDP (ou TCP si problèmes)
Port: 5060
Register Expiration: 600
```

**IMPORTANT:** Créer l'utilisateur `akuvox@neolia-sip.com` sur Kamailio :
```bash
kamctl add akuvox@neolia-sip.com MotDePasseAkuvox123
```

### Configurer les appels

**Menu : Settings → Call Features**

```
Call Button Behavior: Call to preset number
Preset Number: julien@neolia-sip.com (ou juste "julien")
```

Cela permettra à l'Akuvox d'appeler directement l'utilisateur quand quelqu'un appuie sur le bouton d'appel.

## Test de bout en bout

### 1. Vérifier les enregistrements

Sur le VPS, vérifier que l'Akuvox et l'iPhone sont enregistrés :

```bash
kamctl ul show
```

Tu devrais voir :
```
AOR:: akuvox@neolia-sip.com
        Contact:: sip:akuvox@192.168.1.xxx:5060;transport=udp
        ...
AOR:: julien@neolia-sip.com
        Contact:: sip:julien@192.168.1.yyy:xxxxx;transport=ws
        ...
```

### 2. Effectuer un appel test

1. Ouvre l'app sur ton iPhone (ou PC pour debug)
2. Va sur `/intercom-test`
3. Vérifie que "SIP Connecté" est vert
4. Sur l'Akuvox E12W, appuie sur le bouton d'appel

### 3. Comportement attendu

**Côté iPhone:**
- Une notification "Appel entrant de Akuvox" apparaît
- L'UI d'appel entrant s'affiche avec les boutons Accepter/Rejeter
- La vidéo démarre automatiquement (flux WHEP)

**Au moment d'accepter l'appel:**
- L'audio bidirectionnel s'établit (SIP WebRTC)
- La vidéo continue de s'afficher
- Les contrôles de fin d'appel apparaissent

**Logs attendus dans la console:**
```
📞 Real incoming call from Akuvox!
📞 Answering call...
🔗 WebRTC PeerConnection established
✅ Call confirmed (bidirectional audio established)
```

### 4. Troubleshooting

**Problème : "SIP Déconnecté"**
- Vérifier que Kamailio tourne : `systemctl status kamailio`
- Vérifier les certificats TLS : `ls -la /etc/letsencrypt/live/`
- Vérifier le firewall : `ufw status`

**Problème : "SIP Registration Failed"**
- Vérifier les credentials dans l'app
- Vérifier que l'utilisateur existe : `kamctl db show subscriber`
- Vérifier les logs Kamailio : `tail -f /var/log/syslog | grep kamailio`

**Problème : Pas d'appel entrant**
- Vérifier que l'Akuvox est enregistré : `kamctl ul show`
- Vérifier que l'Akuvox appelle le bon numéro (julien@neolia-sip.com)
- Vérifier les logs SIP sur l'Akuvox (Menu → Logs)

**Problème : Pas d'audio**
- Vérifier que le micro est autorisé dans le navigateur
- Vérifier les ICE candidates dans les logs (doit voir "typ relay" si 4G)
- Tester avec STUN/TURN configuré

## Architecture avancée (à venir)

### Projets avec N100

Pour les immeubles avec un N100 sur site :

```
Akuvox ──SIP──> Asterisk N100 ──SIP Trunk──> Kamailio VPS ──WSS──> iPhones
                    │
                    └──SIP──> Panels muraux (local)
```

Configuration Asterisk (N100) :
- Panels internes enregistrés sur Asterisk
- Trunk SIP vers Kamailio pour les utilisateurs remote
- Dialplan pour router les appels selon le destinataire

### Projets sans N100

Pour les maisons individuelles :

```
Akuvox ──SIP──> Kamailio VPS ──WSS──> iPhones
```

Configuration simplifiée :
- L'Akuvox s'enregistre directement sur Kamailio
- Pas d'Asterisk intermédiaire
- Uniquement des utilisateurs remote (pas de panels)

## Sécurité

### Authentification

- Tous les comptes SIP nécessitent un mot de passe fort
- L'authentification est challengée par Kamailio (401 Unauthorized)
- Les mots de passe sont hashés dans la base MySQL

### Transport sécurisé

- WebSocket Secure (WSS) obligatoire pour les navigateurs
- TLS 1.2+ avec certificats Let's Encrypt
- SIP over TLS (SIPS) optionnel pour l'Akuvox

### Firewall

- Seuls les ports SIP (5060/5061) et RTP (10000-20000) sont ouverts
- Rate limiting sur les tentatives d'enregistrement (TODO)
- Fail2ban pour bloquer les attaques par force brute (TODO)

## Prochaines étapes

- [ ] Installer Kamailio sur le VPS
- [ ] Créer le compte SIP de Julien
- [ ] Configurer les credentials dans l'app
- [ ] Configurer l'Akuvox E12W
- [ ] Tester l'appel de bout en bout
- [ ] Documenter les résultats

Une fois ces étapes validées, on pourra :
- Implémenter le système de QR code
- Créer la plateforme web de gestion
- Développer le .exe pour configurer Asterisk N100
- Déployer sur plusieurs sites
