# Formaxe - Acquisition

**Chrome Extension** pour l'extraction, l'envoi et le suivi de contacts depuis [Decidento](https://platform.decidento.com) vers [HubSpot CRM](https://www.hubspot.com).

![Version](https://img.shields.io/badge/version-1.0.0-54B6B4)
![Chrome](https://img.shields.io/badge/chrome-manifest_v3-07163C)
![HubSpot](https://img.shields.io/badge/CRM-HubSpot-ff7a59)

---

## Description

Formaxe - Acquisition s'intègre directement dans les pages de contacts de Decidento et permet aux commerciaux de :

- **Extraire** les informations d'un contact et de son entreprise en un clic
- **Envoyer** les données vers HubSpot CRM via des webhooks n8n
- **Créer ou mettre à jour** automatiquement les contacts et entreprises (upsert par `decidento_contact_id` / SIREN)
- **Assigner** automatiquement le commercial sélectionné comme propriétaire HubSpot
- **Visualiser** le statut de prospection de chaque contact directement dans Decidento (badge vert)

## Architecture

```
Decidento (Chrome Extension)
    │
    ├─── POST /webhook/decidento ──► n8n Cloud ──► HubSpot CRM
    │    (envoi contact + entreprise)      (upsert contact, find/create company, associate)
    │
    └─── POST /webhook/formaxe-check ──► n8n Cloud ──► HubSpot CRM
         (vérification statut)              (search by decidento_contact_id)
```

## Installation

### Mode développeur (Chrome)

1. Télécharger et décompresser le ZIP de l'extension
2. Ouvrir Chrome → `chrome://extensions/`
3. Activer le **Mode développeur** (en haut à droite)
4. Cliquer sur **Charger l'extension non empaquetée**
5. Sélectionner le dossier `formaxe-acquisition/`
6. L'extension apparaît dans la barre d'outils Chrome

### Configuration

1. Cliquer sur l'icône de l'extension → **Réglages**
2. L'URL du webhook est pré-remplie par défaut
3. Sélectionner le **commercial par défaut**
4. Sauvegarder

## Utilisation

1. Se connecter sur [platform.decidento.com](https://platform.decidento.com)
2. Naviguer vers une page contenant des fiches contacts
3. Un bouton **Envoyer vers HubSpot** apparaît sous chaque contact
4. Sélectionner le **statut de prospection** et le **commercial**
5. Cliquer sur **Envoyer vers HubSpot**
6. Confirmation verte en cas de succès

Les contacts déjà dans HubSpot affichent un badge :
> 🟢 Contacté le 05/03/2026 — Email envoyé par Baptiste

## Données extraites

### Contact
| Champ | Description |
|-------|-------------|
| `name` | Nom complet du contact |
| `position` | Poste / fonction |
| `address` | Localisation (ville, code postal) |
| `title_tag` | Titre hiérarchique |
| `linkedin_url` | URL du profil LinkedIn |
| `email` | Email (si disponible) |

### Entreprise
| Champ | Description |
|-------|-------------|
| `name` | Raison sociale |
| `siren` | Numéro SIREN (extrait de l'URL) |
| `address` | Adresse complète |
| `phone` | Téléphone |
| `website` | Site internet |

### Métadonnées
| Champ | Description |
|-------|-------------|
| `commercial` | Commercial sélectionné |
| `status` | Statut de prospection |
| `timestamp` | Date/heure d'envoi (ISO 8601) |
| `source_url` | URL de la page Decidento |
| `decidento_contact_id` | Identifiant unique généré (hash SIREN + nom) |

## Workflows n8n

### Workflow principal — Envoi contact
**33 nœuds** : Webhook → Préparer données → Chercher owners → Résoudre owner → Chercher entreprise (SIREN) → Créer/Trouver entreprise → Chercher contact existant → Créer/Mettre à jour contact → Associer contact ↔ entreprise → Créer Deal → Créer note → Créer tâches (RDV + rappel J+3) → Préparer emails → Récupérer owner HubSpot → Générer signature dynamique → Envoyer emails (confirmation + offre) via Mailjet → Logger emails CRM → Répondre

### Workflow de vérification — Check contact
**4 nœuds** : Webhook → Chercher contact HubSpot → Préparer réponse → Répondre

### Workflow owners — Liste commerciaux
**4 nœuds** : Webhook → Chercher owners HubSpot → Préparer liste → Répondre

## Stack technique

- **Chrome Extension** Manifest V3
- **Content Script** avec MutationObserver (SPA)
- **Background Service Worker** (proxy CORS)
- **n8n Cloud** (orchestration webhooks)
- **HubSpot CRM API** v3/v4 (OAuth2)
- **Mailjet API** v3.1 (emails transactionnels)
- **Chrome Storage API** (préférences utilisateur)

## Charte graphique

| Élément | Valeur |
|---------|--------|
| Couleur principale | `#54B6B4` |
| Couleur secondaire | `#07163C` |
| Police | Segoe UI |

## Statuts de prospection

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
- Liam Gaillard
- Héla de Formaxe
- Carine de Formaxe

## Structure du projet

```
formaxe-acquisition/
├── manifest.json
├── background.js
├── content/
│   ├── content.js
│   └── content.css
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── icons/
├── images/
├── n8n-workflow/
│   ├── workflow-decidento-hubspot.json
│   └── workflow-check-contact.json
└── hubspot-setup/
```

---

**Developed by [Gripow](https://gripow.com)**
