# Configuration CORS pour Home Assistant

Pour que la PWA Neolia puisse communiquer directement avec Home Assistant (upload de photos de pièces, etc.), vous devez configurer CORS dans Home Assistant.

## Configuration

Dans votre fichier `configuration.yaml` de Home Assistant, ajoutez ou modifiez la section `http` :

```yaml
http:
  cors_allowed_origins:
    - https://votre-domaine-pwa.lovable.app
    - https://votre-domaine-personnalise.com
    - http://localhost:5173
    - http://localhost:8080
```

### Exemples de domaines à ajouter

| Environnement | Domaine |
|---------------|---------|
| Lovable Preview | `https://<project-id>.lovableproject.com` |
| Lovable Production | `https://<votre-app>.lovable.app` |
| Développement local | `http://localhost:5173` |
| Domaine personnalisé | `https://votre-domaine.com` |

## Appliquer les changements

Après avoir modifié `configuration.yaml` :

1. **Vérifier la configuration** : Outils de développement → Vérifier la configuration
2. **Redémarrer Home Assistant** : Paramètres → Système → Redémarrer

## Endpoints concernés

Cette configuration CORS permet à la PWA d'appeler :

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/local/neolia/pieces/room_photos.json` | GET | Non | Métadonnées des photos |
| `/api/neolia/room_photo` | POST | Bearer token | Upload de photo |

## Dépannage

### Erreur "Failed to fetch"

Si vous voyez cette erreur dans la console :
```
[RoomPhotos] Network/CORS error during upload. Ensure CORS is configured in Home Assistant.
```

Vérifiez :
1. Que le domaine de votre PWA est bien dans `cors_allowed_origins`
2. Que Home Assistant a été redémarré après la modification
3. Que vous utilisez HTTPS (requis pour les PWA en production)

### Vérifier la configuration CORS

Vous pouvez tester avec curl :
```bash
curl -I -X OPTIONS \
  -H "Origin: https://votre-pwa.lovable.app" \
  -H "Access-Control-Request-Method: POST" \
  https://votre-ha.ui.nabu.casa/api/neolia/room_photo
```

La réponse doit contenir :
```
Access-Control-Allow-Origin: https://votre-pwa.lovable.app
```

## Sécurité

- N'utilisez **jamais** `cors_allowed_origins: "*"` en production
- Listez uniquement les domaines de confiance
- Le token Home Assistant est transmis directement du navigateur vers HA (jamais via un serveur tiers)
