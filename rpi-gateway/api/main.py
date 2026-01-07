"""
Neolia Gateway API
==================
API pour la configuration et l'appairage des panels avec le R-Pi Gateway.

Endpoints:
- GET  /health           - Health check
- GET  /                 - Info gateway (IP, version)
- GET  /discover         - Info pour mDNS discovery
- POST /pair             - Appairage panel via PIN
- GET  /panels           - Liste des panels configures
- POST /panels           - Ajouter un panel
- DELETE /panels/{id}    - Supprimer un panel
"""

import os
import json
import secrets
import socket
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Neolia Gateway API",
    description="API de configuration pour le gateway interphone Neolia",
    version="1.0.0",
)

# CORS permissif pour les panels
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chemins
DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
ASTERISK_DIR = Path(os.getenv("ASTERISK_DIR", "/app/asterisk"))
PANELS_FILE = DATA_DIR / "panels.json"
PINS_FILE = DATA_DIR / "pins.json"

# Duree de validite d'un PIN (minutes)
PIN_VALIDITY_MINUTES = 30


# =============================================================================
# Models
# =============================================================================

class GatewayInfo(BaseModel):
    """Informations sur le gateway"""
    ip: str
    hostname: str
    version: str = "1.0.0"
    sip_port: int = 5060
    whep_port: int = 8889
    api_port: int = 8080


class PanelConfig(BaseModel):
    """Configuration d'un panel"""
    apartment_id: str
    display_name: str
    sip_user: str
    sip_password: str
    sip_server: str
    sip_domain: str
    whep_url: str
    door_method: str = "dtmf"
    door_dtmf_code: str = "#"


class PanelCreateRequest(BaseModel):
    """Requete de creation d'un panel"""
    apartment_id: str
    display_name: str


class PinGenerateRequest(BaseModel):
    """Requete de generation de PIN"""
    apartment_id: str


class PinGenerateResponse(BaseModel):
    """Reponse avec le PIN genere"""
    pin: str
    apartment_id: str
    expires_at: str


class PairRequest(BaseModel):
    """Requete d'appairage avec PIN"""
    pin: str


class PairResponse(BaseModel):
    """Reponse d'appairage avec config complete"""
    success: bool
    config: Optional[PanelConfig] = None
    error: Optional[str] = None


# =============================================================================
# Helpers
# =============================================================================

def get_local_ip() -> str:
    """Recupere l'IP locale du R-Pi"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.115"


def get_hostname() -> str:
    """Recupere le hostname"""
    return socket.gethostname()


def load_json(path: Path) -> dict:
    """Charge un fichier JSON"""
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def save_json(path: Path, data: dict):
    """Sauvegarde un fichier JSON"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def generate_pin() -> str:
    """Genere un PIN a 6 chiffres"""
    return f"{secrets.randbelow(1000000):06d}"


def generate_password() -> str:
    """Genere un mot de passe SIP"""
    return secrets.token_urlsafe(12)


def reload_asterisk():
    """Recharge la configuration Asterisk"""
    try:
        subprocess.run(
            ["docker", "exec", "asterisk", "asterisk", "-rx", "pjsip reload"],
            capture_output=True,
            timeout=10,
        )
    except Exception as e:
        print(f"Warning: Could not reload Asterisk: {e}")


def update_pjsip_config(panels: dict):
    """Met a jour le fichier pjsip.conf avec les panels"""
    # On garde la config de base et on ajoute les panels dynamiquement
    # Pour simplifier, on regenere les sections panel-*

    base_config = ASTERISK_DIR / "pjsip.conf"
    if not base_config.exists():
        return

    # Lire la config de base (jusqu'aux panels preconfigures)
    with open(base_config) as f:
        content = f.read()

    # Trouver la section des panels et la remplacer
    marker = "; -----------------------------------------------------------------------------\n; PANELS PRECONFIGURES"
    if marker in content:
        base_part = content.split(marker)[0]
    else:
        base_part = content

    # Generer les nouvelles sections
    panels_config = f"""; -----------------------------------------------------------------------------
; PANELS CONFIGURES DYNAMIQUEMENT
; -----------------------------------------------------------------------------
; Genere automatiquement par l'API Gateway
; -----------------------------------------------------------------------------

"""

    for apt_id, panel in panels.items():
        sip_user = panel.get("sip_user", f"panel-{apt_id}")
        sip_pass = panel.get("sip_password", "changeme")

        panels_config += f"""
; Panel Appartement {apt_id}
[{sip_user}](panel-template)
auth={sip_user}-auth
aors={sip_user}

[{sip_user}-auth]
type=auth
auth_type=userpass
username={sip_user}
password={sip_pass}

[{sip_user}](panel-aor-template)

"""

    # Ecrire la nouvelle config
    with open(base_config, "w") as f:
        f.write(base_part + panels_config)

    # Recharger Asterisk
    reload_asterisk()


# =============================================================================
# Endpoints
# =============================================================================

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/", response_model=GatewayInfo)
async def get_info():
    """Retourne les informations du gateway"""
    return GatewayInfo(
        ip=get_local_ip(),
        hostname=get_hostname(),
    )


@app.get("/discover", response_model=GatewayInfo)
async def discover():
    """Endpoint de discovery pour les panels"""
    return GatewayInfo(
        ip=get_local_ip(),
        hostname=get_hostname(),
    )


@app.post("/pins", response_model=PinGenerateResponse)
async def generate_pairing_pin(request: PinGenerateRequest):
    """
    Genere un PIN d'appairage pour un appartement.
    Ce PIN est valide pendant 30 minutes.
    A utiliser par l'installateur pour configurer un panel.
    """
    pins = load_json(PINS_FILE)

    # Generer un nouveau PIN
    pin = generate_pin()
    expires_at = datetime.utcnow() + timedelta(minutes=PIN_VALIDITY_MINUTES)

    pins[pin] = {
        "apartment_id": request.apartment_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }

    save_json(PINS_FILE, pins)

    return PinGenerateResponse(
        pin=pin,
        apartment_id=request.apartment_id,
        expires_at=expires_at.isoformat(),
    )


@app.post("/pair", response_model=PairResponse)
async def pair_panel(request: PairRequest):
    """
    Appaire un panel avec le gateway en utilisant un PIN.
    Retourne la configuration complete pour le panel.
    """
    pins = load_json(PINS_FILE)
    panels = load_json(PANELS_FILE)

    # Verifier le PIN
    pin_data = pins.get(request.pin)
    if not pin_data:
        return PairResponse(success=False, error="PIN invalide")

    # Verifier l'expiration
    expires_at = datetime.fromisoformat(pin_data["expires_at"])
    if datetime.utcnow() > expires_at:
        # Supprimer le PIN expire
        del pins[request.pin]
        save_json(PINS_FILE, pins)
        return PairResponse(success=False, error="PIN expire")

    apartment_id = pin_data["apartment_id"]
    local_ip = get_local_ip()

    # Creer ou mettre a jour le panel
    sip_user = f"panel-{apartment_id}"
    sip_password = generate_password()

    panel_data = {
        "apartment_id": apartment_id,
        "display_name": f"Appartement {apartment_id}",
        "sip_user": sip_user,
        "sip_password": sip_password,
        "created_at": datetime.utcnow().isoformat(),
    }

    panels[apartment_id] = panel_data
    save_json(PANELS_FILE, panels)

    # Mettre a jour la config Asterisk
    update_pjsip_config(panels)

    # Supprimer le PIN utilise
    del pins[request.pin]
    save_json(PINS_FILE, pins)

    # Construire la config complete pour le panel
    config = PanelConfig(
        apartment_id=apartment_id,
        display_name=f"Appartement {apartment_id}",
        sip_user=sip_user,
        sip_password=sip_password,
        sip_server=local_ip,
        sip_domain=local_ip,
        whep_url=f"http://{local_ip}:8889/akuvox/whep",
        door_method="dtmf",
        door_dtmf_code="#",
    )

    return PairResponse(success=True, config=config)


@app.get("/panels")
async def list_panels():
    """Liste tous les panels configures"""
    panels = load_json(PANELS_FILE)
    return {"panels": list(panels.values())}


@app.post("/panels", response_model=PanelConfig)
async def create_panel(request: PanelCreateRequest):
    """Cree un nouveau panel (sans appairage PIN)"""
    panels = load_json(PANELS_FILE)

    apartment_id = request.apartment_id
    local_ip = get_local_ip()

    sip_user = f"panel-{apartment_id}"
    sip_password = generate_password()

    panel_data = {
        "apartment_id": apartment_id,
        "display_name": request.display_name,
        "sip_user": sip_user,
        "sip_password": sip_password,
        "created_at": datetime.utcnow().isoformat(),
    }

    panels[apartment_id] = panel_data
    save_json(PANELS_FILE, panels)

    # Mettre a jour Asterisk
    update_pjsip_config(panels)

    return PanelConfig(
        apartment_id=apartment_id,
        display_name=request.display_name,
        sip_user=sip_user,
        sip_password=sip_password,
        sip_server=local_ip,
        sip_domain=local_ip,
        whep_url=f"http://{local_ip}:8889/akuvox/whep",
    )


@app.delete("/panels/{apartment_id}")
async def delete_panel(apartment_id: str):
    """Supprime un panel"""
    panels = load_json(PANELS_FILE)

    if apartment_id not in panels:
        raise HTTPException(status_code=404, detail="Panel non trouve")

    del panels[apartment_id]
    save_json(PANELS_FILE, panels)

    # Mettre a jour Asterisk
    update_pjsip_config(panels)

    return {"success": True}


@app.get("/akuvox/config")
async def get_akuvox_config():
    """Retourne la configuration pour l'Akuvox"""
    panels = load_json(PANELS_FILE)
    local_ip = get_local_ip()

    # Generer le carnet d'adresses Akuvox
    contacts = []
    for apt_id, panel in panels.items():
        contacts.append({
            "fn": panel.get("display_name", f"Apt {apt_id}"),
            "n": apt_id,
            "tel": apt_id,  # L'Akuvox appelle ce numero, Asterisk route vers le panel
        })

    return {
        "sip_server": local_ip,
        "sip_port": 5060,
        "sip_user": "100",
        "sip_password": "akuvox2024",
        "contacts": contacts,
    }
