# Formaxe - Acquisition

**Chrome Extension** pour l'extraction et l'export de contacts depuis la plateforme [Decidento](https://platform.decidento.com).

![Version](https://img.shields.io/badge/version-1.0.0-54B6B4)
![Chrome](https://img.shields.io/badge/chrome-extension-07163C)

---

## Description

Formaxe - Acquisition est une extension Chrome qui s'intègre directement dans les pages de contacts de Decidento. Elle permet aux commerciaux de :

- Extraire les informations d'un contact (nom, poste, adresse, titre, LinkedIn, email)
- Extraire les informations de l'entreprise associée (nom, adresse, téléphone, site web)
- Sélectionner un statut d'appel et le nom du commercial
- Envoyer les données vers un webhook (n8n, Zapier, Make, etc.)

## Installation

### Mode développeur (Chrome)

1. Ouvrir Chrome et naviguer vers `chrome://extensions/`
2. Activer le **Mode développeur** (en haut à droite)
3. Cliquer sur **Charger l'extension non empaquetée**
4. Sélectionner le dossier `formaxe-acquisition/`
5. L'extension apparaît dans la barre d'outils Chrome

### Configuration

1. Cliquer sur l'icône de l'extension > **Options**
2. Entrer l'URL du webhook de destination
3. Sauvegarder

## Utilisation

1. Naviguer sur une page contact Decidento (ex: `platform.decidento.com/extranet/company/detail/...`)
2. Un bouton **Formaxe** apparaît sous chaque bloc contact
3. Cliquer pour déplier le mini-formulaire
4. Sélectionner le **Statut** et le **Commercial**
5. Cliquer sur **Envoyer** pour exporter les données vers le webhook

## Données extraites

### Contact
| Champ | Description |
|-------|-------------|
| `name` | Nom complet du contact |
| `position` | Poste / fonction |
| `address` | Localisation (ville, code postal) |
| `title_tag` | Titre hiérarchique (ex: Dirigeant opérationnel) |
| `linkedin_url` | URL du profil LinkedIn |
| `email` | Email (si détecté) |

### Entreprise
| Champ | Description |
|-------|-------------|
| `name` | Raison sociale |
| `address` | Adresse complète |
| `phone` | Téléphone |
| `website` | Site internet |

### Métadonnées
| Champ | Description |
|-------|-------------|
| `commercial` | Nom du commercial sélectionné |
| `status` | Statut d'appel sélectionné |
| `timestamp` | Date et heure d'envoi (ISO 8601) |
| `source_url` | URL de la page Decidento |

## Structure du payload webhook

```json
{
  "timestamp": "2026-03-05T10:30:00.000Z",
  "commercial": "Baptiste Cordier",
  "status": "Rendez-vous pris",
  "contact": {
    "name": "Remi Vaumas",
    "position": "Digital & IS Transformation Associate Director",
    "address": "Nanterre (92000 - Hauts-de-Seine)",
    "title_tag": "Dirigeant opérationnel",
    "linkedin_url": "http://www.linkedin.com/in/rémi-de-vaumas-09314812",
    "email": ""
  },
  "company": {
    "name": "OPMOBILITY SE",
    "address": "19 boulevard Jules Carteret, 69007 LYON - FRANCE",
    "phone": "+33140876400",
    "website": "http://www.opmobility.com"
  },
  "source_url": "https://platform.decidento.com/extranet/company/detail/FR_955512611#contacts"
}
```

## Stack technique

- **Manifest V3** (Chrome Extension)
- **Content Script** : injection dans les pages Decidento
- **MutationObserver** : détection dynamique des contacts (SPA)
- **Chrome Storage API** : sauvegarde des préférences
- **Fetch API** : envoi vers webhook

## Charte graphique

| Élément | Valeur |
|---------|--------|
| Couleur principale | `#54B6B4` |
| Couleur secondaire | `#07163C` |
| Police | Segoe UI |

## Statuts disponibles

- Message vocal laissé
- Email envoyé
- Injoignable
- Rendez-vous pris
- Ne plus rappeler
- Déjà appelé
- Pas intéressé
- Déjà en partenariat
- A raccroché

## Commerciaux

- Baptiste Cordier
- Louis Prezeau

---

**Developed by Gripow**
