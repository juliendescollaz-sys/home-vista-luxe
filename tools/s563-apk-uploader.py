#!/usr/bin/env python3
"""
Script pour uploader un APK sur un panel Akuvox S563

Usage:
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --apk app-release.apk

Le script:
1. Se connecte a l'interface web du S563 via l'API JSON
2. Recupere le token d'authentification
3. Upload l'APK via l'API

Prerequis:
    pip install requests
"""

import argparse
import requests
import sys
import os
import hashlib
import json
import secrets
from urllib3.exceptions import InsecureRequestWarning

# Desactiver les warnings SSL (certificat auto-signe)
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class S563Uploader:
    def __init__(self, ip: str, username: str, password: str, verify_ssl: bool = False):
        self.base_url = f"https://{ip}"
        self.username = username
        self.password = password
        self.verify_ssl = verify_ssl
        self.session = requests.Session()
        self.token = None

    def _hash_password(self, password: str) -> str:
        """
        Hash le mot de passe en MD5 (format attendu par le S563).
        """
        return hashlib.md5(password.encode()).hexdigest()

    def _generate_client_rand(self) -> str:
        """
        Genere un nonce aleatoire cote client (128 caracteres hex).
        """
        return secrets.token_hex(64).upper()

    def _get_rand(self) -> str:
        """
        Obtient le nonce (rand) du serveur.
        C'est la premiere etape du login.
        """
        payload = {
            "target": "login",
            "action": "rand",
            "session": ""
        }

        resp = self.session.post(
            f"{self.base_url}/api",
            json=payload,
            verify=self.verify_ssl,
            timeout=10
        )

        if resp.status_code != 200:
            raise Exception(f"Erreur HTTP: {resp.status_code}")

        result = resp.json()
        if result.get("retcode") != 0:
            raise Exception(f"Erreur getRand: {result.get('message')}")

        rand = result.get("data", {}).get("rand")
        if not rand:
            raise Exception("Rand non trouve dans la reponse")

        return rand

    def login(self) -> bool:
        """
        Se connecte a l'interface web du S563 et recupere le token.

        API Login S563 (2 etapes):
        1. POST /api avec action="rand" -> recupere le nonce du serveur (server_rand)
        2. POST /api avec action="login":
           - session = server_rand (le rand recu du serveur)
           - data.rand = client_rand (un rand genere cote client)
           - data.password = MD5(password)
        """
        print(f"[*] Connexion a {self.base_url}...")

        # Etape 1: Obtenir le rand du serveur
        try:
            server_rand = self._get_rand()
            print(f"[+] Server rand: {server_rand[:32]}...")
        except Exception as e:
            print(f"[-] Erreur getRand: {e}")
            return False

        # Etape 2: Login avec les deux rands
        password_hash = self._hash_password(self.password)
        client_rand = self._generate_client_rand()
        print(f"[+] Client rand: {client_rand[:32]}...")

        # Construire le payload de login
        # Note: le champ "data" est une STRING JSON, pas un objet
        # Note: "session" contient le server_rand, "data.rand" contient le client_rand
        data_inner = json.dumps({
            "userName": self.username,
            "password": password_hash,
            "rand": client_rand
        })

        payload = {
            "target": "login",
            "action": "login",
            "data": data_inner,
            "session": server_rand  # Le rand du serveur va dans session
        }

        try:
            resp = self.session.post(
                f"{self.base_url}/api",
                json=payload,
                verify=self.verify_ssl,
                timeout=10
            )

            if resp.status_code != 200:
                print(f"[-] Erreur HTTP: {resp.status_code}")
                return False

            result = resp.json()

            # Verifier le code retour
            if result.get("retcode") != 0:
                print(f"[-] Erreur login: {result.get('message', 'Unknown error')}")
                return False

            # Extraire le token
            data = result.get("data", {})
            self.token = data.get("token")

            if not self.token:
                print("[-] Token non trouve dans la reponse")
                print(f"    Reponse: {json.dumps(result, indent=2)}")
                return False

            print(f"[+] Login reussi!")
            print(f"    User: {data.get('userType', 'unknown')}")
            print(f"    Token: {self.token[:32]}...")

            # Stocker le token dans le cookie aussi
            self.session.cookies.set("httpsToken", self.token)

            return True

        except requests.exceptions.RequestException as e:
            print(f"[-] Erreur reseau: {e}")
            return False
        except json.JSONDecodeError as e:
            print(f"[-] Erreur JSON: {e}")
            print(f"    Reponse brute: {resp.text[:500]}")
            return False

    def upload_apk(self, apk_path: str) -> bool:
        """
        Upload l'APK sur le panel S563.

        Endpoint: POST /api/phoneApp/upload
        Headers: authorization: <token>
        Cookie: httpsToken=<token>
        Body: multipart/form-data avec fichier dans champ 'file'
        """
        if not self.token:
            print("[-] Pas de token d'authentification")
            return False

        if not os.path.exists(apk_path):
            print(f"[-] Fichier APK non trouve: {apk_path}")
            return False

        apk_filename = os.path.basename(apk_path)
        apk_size = os.path.getsize(apk_path)
        print(f"[*] Upload de {apk_filename} ({apk_size / 1024 / 1024:.2f} MB)...")

        # Preparer les headers
        headers = {
            "authorization": self.token,
        }

        # Preparer les cookies
        cookies = {
            "httpsToken": self.token,
        }

        # Preparer le fichier
        with open(apk_path, "rb") as f:
            files = {
                "file": (apk_filename, f, "application/vnd.android.package-archive")
            }

            try:
                resp = self.session.post(
                    f"{self.base_url}/api/phoneApp/upload",
                    headers=headers,
                    cookies=cookies,
                    files=files,
                    verify=self.verify_ssl,
                    timeout=120  # Timeout long pour gros fichiers
                )

                if resp.status_code == 200:
                    print(f"[+] Upload reussi!")
                    try:
                        data = resp.json()
                        print(f"    Reponse: {json.dumps(data, indent=2)}")
                    except:
                        print(f"    Reponse: {resp.text[:200]}")
                    return True
                else:
                    print(f"[-] Echec upload: HTTP {resp.status_code}")
                    print(f"    Reponse: {resp.text[:500]}")
                    return False

            except requests.exceptions.RequestException as e:
                print(f"[-] Erreur reseau: {e}")
                return False

    def list_apps(self) -> list:
        """
        Liste les apps installees sur le panel (si l'API le permet).
        """
        if not self.token:
            return []

        headers = {"authorization": self.token}
        cookies = {"httpsToken": self.token}

        endpoints = [
            "/api/phoneApp/list",
            "/api/phoneApp",
            "/api/apps",
        ]

        for endpoint in endpoints:
            try:
                resp = self.session.get(
                    f"{self.base_url}{endpoint}",
                    headers=headers,
                    cookies=cookies,
                    verify=self.verify_ssl,
                    timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"[+] Apps installees: {json.dumps(data, indent=2)}")
                    return data if isinstance(data, list) else data.get("apps", [])
            except:
                continue

        return []

    def get_system_info(self) -> dict:
        """
        Recupere les infos systeme du panel.
        """
        if not self.token:
            return {}

        headers = {"authorization": self.token}
        cookies = {"httpsToken": self.token}

        # Essayer via l'API JSON standard
        payload = {
            "target": "system",
            "action": "getInfo",
            "data": "{}",
            "session": self.token
        }

        try:
            resp = self.session.post(
                f"{self.base_url}/api",
                json=payload,
                headers=headers,
                cookies=cookies,
                verify=self.verify_ssl,
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("retcode") == 0:
                    print(f"[+] System info: {json.dumps(data.get('data', {}), indent=2)}")
                    return data.get("data", {})
        except:
            pass

        return {}


def main():
    parser = argparse.ArgumentParser(
        description="Upload APK sur panel Akuvox S563",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
    # Upload avec login automatique
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --apk app.apk

    # Upload avec token manuel (recupere depuis le navigateur)
    python s563-apk-uploader.py --ip 192.168.1.23 --token 6F70C544... --apk app.apk

    # Lister les apps installees
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --list

    # Afficher les infos systeme
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --info
        """
    )

    parser.add_argument("--ip", required=True, help="Adresse IP du panel S563")
    parser.add_argument("--user", default="admin", help="Nom d'utilisateur (default: admin)")
    parser.add_argument("--password", help="Mot de passe")
    parser.add_argument("--token", help="Token d'authentification (si deja connu)")
    parser.add_argument("--apk", help="Chemin vers le fichier APK a uploader")
    parser.add_argument("--list", action="store_true", help="Lister les apps installees")
    parser.add_argument("--info", action="store_true", help="Afficher les infos systeme")
    parser.add_argument("--verify-ssl", action="store_true", help="Verifier le certificat SSL")

    args = parser.parse_args()

    # Validation
    if not args.apk and not args.list and not args.info:
        parser.error("--apk, --list ou --info requis")

    if not args.token and not args.password:
        parser.error("--password ou --token requis")

    # Creer l'uploader
    uploader = S563Uploader(
        ip=args.ip,
        username=args.user,
        password=args.password or "",
        verify_ssl=args.verify_ssl
    )

    # Token manuel ou login
    if args.token:
        uploader.token = args.token
        print(f"[*] Utilisation du token fourni: {args.token[:32]}...")
    else:
        if not uploader.login():
            sys.exit(1)

    # Actions
    if args.info:
        uploader.get_system_info()

    if args.list:
        uploader.list_apps()

    if args.apk:
        if not uploader.upload_apk(args.apk):
            sys.exit(1)

    print("[+] Termine!")


if __name__ == "__main__":
    main()
