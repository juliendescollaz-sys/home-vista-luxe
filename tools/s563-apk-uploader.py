#!/usr/bin/env python3
"""
Script pour uploader un APK sur un panel Akuvox S563

Usage:
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --apk app-release.apk

Le script:
1. Se connecte a l'interface web du S563
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

    def login(self) -> bool:
        """
        Se connecte a l'interface web du S563 et recupere le token.

        L'authentification Akuvox utilise generalement:
        - Digest auth ou
        - POST /api/login avec username/password
        - Le token est retourne dans la reponse ou dans un cookie
        """
        print(f"[*] Connexion a {self.base_url}...")

        # Methode 1: Essayer l'endpoint de login standard
        login_endpoints = [
            "/api/login",
            "/cgi-bin/login",
            "/login",
            "/api/Account/Login",
        ]

        for endpoint in login_endpoints:
            try:
                # Essai avec JSON body
                resp = self.session.post(
                    f"{self.base_url}{endpoint}",
                    json={"username": self.username, "password": self.password},
                    verify=self.verify_ssl,
                    timeout=10
                )

                if resp.status_code == 200:
                    data = resp.json() if resp.text else {}
                    # Chercher le token dans la reponse
                    self.token = data.get("token") or data.get("httpsToken") or data.get("accessToken")
                    if self.token:
                        print(f"[+] Login reussi via {endpoint}")
                        return True

                    # Verifier si le token est dans les cookies
                    if "httpsToken" in self.session.cookies:
                        self.token = self.session.cookies["httpsToken"]
                        print(f"[+] Login reussi via {endpoint} (token dans cookie)")
                        return True

            except requests.exceptions.RequestException:
                continue
            except json.JSONDecodeError:
                # Essayer avec form data
                try:
                    resp = self.session.post(
                        f"{self.base_url}{endpoint}",
                        data={"username": self.username, "password": self.password},
                        verify=self.verify_ssl,
                        timeout=10
                    )
                    if resp.status_code == 200 and "httpsToken" in self.session.cookies:
                        self.token = self.session.cookies["httpsToken"]
                        print(f"[+] Login reussi via {endpoint} (form data)")
                        return True
                except:
                    continue

        # Methode 2: Digest auth (utilise par certains firmwares Akuvox)
        try:
            from requests.auth import HTTPDigestAuth
            resp = self.session.get(
                f"{self.base_url}/",
                auth=HTTPDigestAuth(self.username, self.password),
                verify=self.verify_ssl,
                timeout=10
            )
            if resp.status_code == 200:
                if "httpsToken" in self.session.cookies:
                    self.token = self.session.cookies["httpsToken"]
                    print("[+] Login reussi via Digest Auth")
                    return True
        except:
            pass

        print("[-] Echec de connexion - endpoint de login non trouve")
        print("    Tu peux fournir le token manuellement avec --token")
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


def main():
    parser = argparse.ArgumentParser(
        description="Upload APK sur panel Akuvox S563",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
    # Upload avec login automatique
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --apk app.apk

    # Upload avec token manuel (recupere depuis le navigateur)
    python s563-apk-uploader.py --ip 192.168.1.23 --token 393775BC... --apk app.apk

    # Lister les apps installees
    python s563-apk-uploader.py --ip 192.168.1.23 --user admin --password admin123 --list
        """
    )

    parser.add_argument("--ip", required=True, help="Adresse IP du panel S563")
    parser.add_argument("--user", default="admin", help="Nom d'utilisateur (default: admin)")
    parser.add_argument("--password", help="Mot de passe")
    parser.add_argument("--token", help="Token d'authentification (si deja connu)")
    parser.add_argument("--apk", help="Chemin vers le fichier APK a uploader")
    parser.add_argument("--list", action="store_true", help="Lister les apps installees")
    parser.add_argument("--verify-ssl", action="store_true", help="Verifier le certificat SSL")

    args = parser.parse_args()

    # Validation
    if not args.apk and not args.list:
        parser.error("--apk ou --list requis")

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
        print(f"[*] Utilisation du token fourni")
    else:
        if not uploader.login():
            sys.exit(1)

    # Actions
    if args.list:
        uploader.list_apps()

    if args.apk:
        if not uploader.upload_apk(args.apk):
            sys.exit(1)

    print("[+] Termine!")


if __name__ == "__main__":
    main()
