# Configuration CORS pour Home Assistant

Pour que la PWA Neolia puisse communiquer directement avec Home Assistant, vous devez configurer CORS dans Home Assistant.

> **Note** : Les photos de pièces sont désormais stockées localement sur l'appareil et ne nécessitent pas cette configuration.

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

## Sécurité

- N'utilisez **jamais** `cors_allowed_origins: "*"` en production
- Listez uniquement les domaines de confiance
