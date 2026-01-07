#!/bin/bash
# =============================================================================
# Script d'installation Neolia Gateway pour Raspberry Pi
# =============================================================================
# Usage: curl -sSL https://raw.githubusercontent.com/.../install.sh | bash
# Ou:    ./install.sh
# =============================================================================

set -e

echo "=============================================="
echo "  Installation Neolia Gateway"
echo "=============================================="
echo ""

# Verifier qu'on est root
if [ "$EUID" -ne 0 ]; then
    echo "Ce script doit etre execute en root (sudo)"
    exit 1
fi

# Variables
INSTALL_DIR="/opt/neolia-gateway"
HOSTNAME_NEW="neolia-gateway"

echo "[1/6] Mise a jour du systeme..."
apt-get update
apt-get upgrade -y

echo "[2/6] Installation de Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker pi 2>/dev/null || usermod -aG docker $SUDO_USER 2>/dev/null || true
    systemctl enable docker
    systemctl start docker
fi

echo "[3/6] Installation de Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

echo "[4/6] Configuration du hostname..."
hostnamectl set-hostname $HOSTNAME_NEW
echo "127.0.1.1 $HOSTNAME_NEW" >> /etc/hosts

echo "[5/6] Installation d'Avahi pour mDNS..."
apt-get install -y avahi-daemon avahi-utils
systemctl enable avahi-daemon
systemctl start avahi-daemon

echo "[6/6] Deploiement de Neolia Gateway..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Telecharger les fichiers de config (ou les copier localement)
if [ -d "/tmp/neolia-gateway" ]; then
    cp -r /tmp/neolia-gateway/* $INSTALL_DIR/
else
    echo "ATTENTION: Copiez les fichiers de configuration dans $INSTALL_DIR"
    echo "Puis executez: cd $INSTALL_DIR && docker-compose up -d"
    exit 0
fi

# Creer les dossiers de donnees
mkdir -p $INSTALL_DIR/data

# Demarrer les services
docker-compose up -d

echo ""
echo "=============================================="
echo "  Installation terminee!"
echo "=============================================="
echo ""
echo "Le gateway est accessible a:"
echo "  - mDNS:  http://neolia-gateway.local:8080"
echo "  - IP:    http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "Services:"
echo "  - API:      port 8080"
echo "  - SIP:      port 5060"
echo "  - WHEP:     port 8889"
echo ""
echo "Pour voir les logs: docker-compose logs -f"
echo ""
