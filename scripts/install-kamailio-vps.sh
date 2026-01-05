#!/bin/bash

###############################################################################
# Script d'installation Kamailio pour Home Vista Luxe
# VPS: 141.227.158.64 (Debian/Ubuntu)
#
# Fonctionnalités:
# - SIP Proxy/Registrar pour Akuvox E12W
# - WebSocket (WSS) pour JsSIP (navigateurs/PWA)
# - Trunking SIP vers Asterisk N100 (projets avec N100)
# - Base de données utilisateurs MySQL
# - TLS avec Let's Encrypt
#
# Usage:
#   sudo bash install-kamailio-vps.sh
###############################################################################

set -e  # Exit on error

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de configuration
DOMAIN="neolia-sip.com"  # À remplacer par ton domaine
VPS_IP="141.227.158.64"
DB_NAME="kamailio"
DB_USER="kamailio"
DB_PASS="$(openssl rand -base64 32)"  # Mot de passe aléatoire
KAMAILIO_VERSION="5.7"

echo -e "${GREEN}=== Installation Kamailio pour Home Vista Luxe ===${NC}"
echo "VPS IP: $VPS_IP"
echo "Domaine SIP: $DOMAIN"
echo ""

# 1. Vérifier les droits root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Ce script doit être exécuté en tant que root${NC}"
   exit 1
fi

# 2. Mettre à jour le système
echo -e "${YELLOW}📦 Mise à jour du système...${NC}"
apt update && apt upgrade -y

# 3. Installer les dépendances
echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
apt install -y \
    gnupg2 \
    curl \
    wget \
    git \
    build-essential \
    mysql-server \
    nginx \
    certbot \
    python3-certbot-nginx

# 4. Installer Kamailio
echo -e "${YELLOW}📦 Installation de Kamailio ${KAMAILIO_VERSION}...${NC}"

# Ajouter le repo Kamailio
wget -O- https://deb.kamailio.org/kamailiodebkey.gpg | apt-key add -
echo "deb http://deb.kamailio.org/kamailio${KAMAILIO_VERSION} $(lsb_release -sc) main" > /etc/apt/sources.list.d/kamailio.list
apt update

# Installer Kamailio avec modules
apt install -y \
    kamailio \
    kamailio-mysql-modules \
    kamailio-websocket-modules \
    kamailio-tls-modules \
    kamailio-presence-modules \
    kamailio-utils-modules

# 5. Configurer MySQL pour Kamailio
echo -e "${YELLOW}🗄️ Configuration de la base de données MySQL...${NC}"

# Sécuriser MySQL
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';"

# Créer la base de données Kamailio
kamdbctl create <<EOF
yes
${DB_PASS}
${DB_PASS}
EOF

echo -e "${GREEN}✅ Base de données Kamailio créée${NC}"

# 6. Générer les certificats TLS avec Let's Encrypt
echo -e "${YELLOW}🔒 Configuration TLS avec Let's Encrypt...${NC}"

# Note: Nécessite un domaine pointant vers le VPS
if [ "$DOMAIN" != "neolia-sip.com" ]; then
    certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

    # Créer le certificat combiné pour Kamailio
    cat /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
        /etc/letsencrypt/live/$DOMAIN/privkey.pem > /etc/kamailio/kamailio-tls.pem

    chmod 600 /etc/kamailio/kamailio-tls.pem
    echo -e "${GREEN}✅ Certificats TLS générés${NC}"
else
    echo -e "${YELLOW}⚠️ Configuration TLS manuelle requise (domaine non configuré)${NC}"
fi

# 7. Configurer Kamailio
echo -e "${YELLOW}⚙️ Configuration de Kamailio...${NC}"

# Backup de la config par défaut
cp /etc/kamailio/kamailio.cfg /etc/kamailio/kamailio.cfg.backup

# Créer la configuration Kamailio personnalisée
cat > /etc/kamailio/kamailio.cfg <<'KAMAILIO_CFG'
#!KAMAILIO

####### Home Vista Luxe - Configuration Kamailio #######
# Support:
# - Akuvox E12W (SIP UDP/TCP)
# - JsSIP Web clients (WebSocket WSS)
# - Asterisk N100 trunking (pour projets avec N100)

####### Global Parameters #########

# Logs
debug=3
log_stderror=no
log_facility=LOG_LOCAL0

# Processus
children=8

# Network
listen=udp:141.227.158.64:5060
listen=tcp:141.227.158.64:5060
listen=tls:141.227.158.64:5061
listen=tcp:141.227.158.64:8080  # WebSocket
alias="neolia-sip.com"

####### Modules Section ########

# Modules de base
loadmodule "db_mysql.so"
loadmodule "tm.so"
loadmodule "tmx.so"
loadmodule "sl.so"
loadmodule "rr.so"
loadmodule "pv.so"
loadmodule "maxfwd.so"
loadmodule "usrloc.so"
loadmodule "registrar.so"
loadmodule "textops.so"
loadmodule "siputils.so"
loadmodule "xlog.so"
loadmodule "sanity.so"
loadmodule "ctl.so"
loadmodule "cfg_rpc.so"
loadmodule "acc.so"
loadmodule "auth.so"
loadmodule "auth_db.so"

# WebSocket pour JsSIP
loadmodule "xhttp.so"
loadmodule "websocket.so"
loadmodule "nathelper.so"

# TLS
loadmodule "tls.so"

####### Module Parameters #########

# MySQL
modparam("db_mysql", "ping_interval", 60)

# Auth
modparam("auth_db", "db_url", "mysql://kamailio:DBPASS@localhost/kamailio")
modparam("auth_db", "calculate_ha1", yes)
modparam("auth_db", "password_column", "password")
modparam("auth_db", "load_credentials", "")

# Usrloc (registrations)
modparam("usrloc", "db_url", "mysql://kamailio:DBPASS@localhost/kamailio")
modparam("usrloc", "db_mode", 2)
modparam("usrloc", "use_domain", 0)

# Registrar
modparam("registrar", "method_filtering", 1)
modparam("registrar", "max_expires", 3600)
modparam("registrar", "gruu_enabled", 0)

# RR (Record-Route)
modparam("rr", "enable_full_lr", 1)
modparam("rr", "append_fromtag", 1)

# WebSocket
modparam("websocket", "ping_interval", 30)

# TLS
modparam("tls", "config", "/etc/kamailio/tls.cfg")

# Nathelper (pour WebRTC)
modparam("nathelper", "natping_interval", 30)
modparam("nathelper", "ping_nated_only", 1)

####### Routing Logic ########

request_route {
    # Logs
    xlog("L_INFO", "[$rm] $fu -> $ru (src: $si:$sp)\n");

    # Sanity checks
    if (!sanity_check("1511", "7")) {
        xlog("L_WARN", "Malformed SIP message from $si:$sp\n");
        exit;
    }

    # Max-Forwards
    if (!mf_process_maxfwd_header("10")) {
        sl_send_reply("483", "Too Many Hops");
        exit;
    }

    # OPTIONS keepalive
    if (is_method("OPTIONS") && uri==myself) {
        sl_send_reply("200", "OK");
        exit;
    }

    # WebSocket support
    if (proto == WS || proto == WSS) {
        if (nat_uac_test("64")) {
            # WebRTC client detected
            setflag(FLT_NATS);
        }
    }

    # Record-Route pour tous les messages de dialogue
    if (is_method("INVITE|SUBSCRIBE")) {
        record_route();
    }

    # Loose-Route
    if (loose_route()) {
        if (is_method("BYE")) {
            setflag(FLT_ACC);
        }
        route(RELAY);
        exit;
    }

    # CANCEL
    if (is_method("CANCEL")) {
        if (t_check_trans()) {
            route(RELAY);
        }
        exit;
    }

    # REGISTER
    if (is_method("REGISTER")) {
        route(REGISTER);
        exit;
    }

    # Authentification pour INVITE/MESSAGE
    if (is_method("INVITE|MESSAGE")) {
        if (!is_present_hf("Proxy-Authorization")) {
            auth_challenge("$fd", "0");
            exit;
        }
        if (!auth_check("$fd", "subscriber", "1")) {
            auth_challenge("$fd", "0");
            exit;
        }
        consume_credentials();
    }

    # Router l'appel
    route(LOCATION);
}

# REGISTER handler
route[REGISTER] {
    if (!is_present_hf("Authorization")) {
        auth_challenge("$fd", "0");
        exit;
    }

    if (!auth_check("$fd", "subscriber", "1")) {
        auth_challenge("$fd", "0");
        exit;
    }

    if (!save("location")) {
        sl_reply_error();
    }

    exit;
}

# Location lookup
route[LOCATION] {
    if (!lookup("location")) {
        sl_send_reply("404", "Not Found");
        exit;
    }

    route(RELAY);
}

# Relay
route[RELAY] {
    if (!t_relay()) {
        sl_reply_error();
    }
    exit;
}

# WebSocket handler
event_route[xhttp:request] {
    set_reply_close();
    set_reply_no_connect();

    if ($Rp != 8080) {
        xhttp_reply("403", "Forbidden", "", "");
        exit;
    }

    if ($hdr(Upgrade) =~ "websocket" && $hdr(Connection) =~ "Upgrade") {
        xlog("L_INFO", "WebSocket connection from $si:$sp\n");

        if (ws_handle_handshake()) {
            exit;
        }
    }

    xhttp_reply("404", "Not Found", "", "");
}

event_route[websocket:closed] {
    xlog("L_INFO", "WebSocket connection closed from $si:$sp\n");
}
KAMAILIO_CFG

# Remplacer le mot de passe MySQL dans la config
sed -i "s/DBPASS/${DB_PASS}/g" /etc/kamailio/kamailio.cfg

# 8. Configurer TLS
cat > /etc/kamailio/tls.cfg <<'TLS_CFG'
[server:default]
method = TLSv1.2+
verify_certificate = no
require_certificate = no
private_key = /etc/kamailio/kamailio-tls.pem
certificate = /etc/kamailio/kamailio-tls.pem

[client:default]
method = TLSv1.2+
verify_certificate = no
require_certificate = no
TLS_CFG

# 9. Configurer Nginx comme reverse proxy pour WebSocket WSS
cat > /etc/nginx/sites-available/kamailio-ws <<'NGINX_CFG'
upstream kamailio_ws {
    server 127.0.0.1:8080;
}

server {
    listen 443 ssl http2;
    server_name neolia-sip.com;

    ssl_certificate /etc/letsencrypt/live/neolia-sip.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neolia-sip.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://kamailio_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
NGINX_CFG

ln -sf /etc/nginx/sites-available/kamailio-ws /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 10. Démarrer Kamailio
echo -e "${YELLOW}🚀 Démarrage de Kamailio...${NC}"
systemctl enable kamailio
systemctl start kamailio
systemctl status kamailio --no-pager

# 11. Créer le premier utilisateur de test
echo -e "${YELLOW}👤 Création d'un utilisateur de test...${NC}"
kamctl add test@$DOMAIN test123

# 12. Configurer le firewall
echo -e "${YELLOW}🔥 Configuration du firewall...${NC}"
ufw allow 5060/udp    # SIP UDP
ufw allow 5060/tcp    # SIP TCP
ufw allow 5061/tcp    # SIP TLS
ufw allow 8080/tcp    # WebSocket
ufw allow 443/tcp     # HTTPS/WSS
ufw allow 10000:20000/udp  # RTP pour audio

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installation Kamailio terminée !${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Configuration SIP:"
echo "  - Domaine SIP: $DOMAIN"
echo "  - SIP UDP: sip:${VPS_IP}:5060"
echo "  - SIP TCP: sip:${VPS_IP}:5060;transport=tcp"
echo "  - SIP TLS: sips:${VPS_IP}:5061"
echo "  - WebSocket: ws://${VPS_IP}:8080"
echo "  - WebSocket Secure: wss://${DOMAIN}:443"
echo ""
echo "Base de données:"
echo "  - MySQL User: ${DB_USER}"
echo "  - MySQL Pass: ${DB_PASS}"
echo "  - DB Name: ${DB_NAME}"
echo ""
echo "Utilisateur de test créé:"
echo "  - Username: test@${DOMAIN}"
echo "  - Password: test123"
echo ""
echo "Commandes utiles:"
echo "  - kamctl add user@domain password    # Ajouter un utilisateur"
echo "  - kamctl rm user@domain             # Supprimer un utilisateur"
echo "  - kamctl ul show                    # Voir les registrations"
echo "  - kamctl fifo profile get_size profile  # Voir les appels actifs"
echo "  - systemctl status kamailio         # Statut du service"
echo ""
echo -e "${YELLOW}⚠️ IMPORTANT:${NC}"
echo "1. Configure ton domaine DNS à pointer vers ${VPS_IP}"
echo "2. Remplace 'neolia-sip.com' par ton vrai domaine dans:"
echo "   - /etc/kamailio/kamailio.cfg"
echo "   - /etc/nginx/sites-available/kamailio-ws"
echo "3. Relance les services après modification du domaine"
echo ""
