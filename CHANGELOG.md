# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.4.0] - 2026-03-05

### Ajouté
- **Email 1 — Confirmation RDV + Brochure** : envoi SMTP automatique quand la checkbox "Envoyer mail de confirmation de RDV" est cochée. Contient la présentation de L'Atelier des Experts©, les 4 engagements, et un bouton de téléchargement de la brochure PDF
- **Email 2 — Post-RDV / Contrat Yousign** : envoi SMTP automatique quand la checkbox "Envoyer mail de présentation de l'offre" est cochée. Mentionne l'envoi du contrat via Yousign et l'accès à la plateforme Stafy©
- **Signatures dynamiques par commercial** : Louis PREZEAU (Commercial Partenaires | Atelier des Experts©, 0184754720, louis@atelierdesexperts.fr), Baptiste Cordier, et signature par défaut. Chaque email est signé par le commercial sélectionné
- **Log CRM automatique** : chaque email envoyé est enregistré sur la fiche contact HubSpot via l'API CRM Email (`/crm/v3/objects/emails`) avec association type 198, sujet, contenu HTML/texte, sender et recipient
- **7 nouveaux nœuds n8n** : "Préparer emails", "Email confirmation ?", "Envoyer email confirmation", "Logger email 1 CRM", "Email offre ?", "Envoyer email offre", "Logger email 2 CRM" → workflow passe de 24 à 31 nœuds

### ⚠️ En attente
- **Credential SMTP** : les nœuds d'envoi email ont un placeholder `SMTP_CREDENTIAL_ID`. Il faut créer le credential SMTP dans n8n (Gmail App Password ou autre) et remplacer l'ID dans les 2 nœuds emailSend

## [1.3.0] - 2026-03-05

### Ajouté
- **Pipeline HubSpot "Prospection Decidento"** : 8 stages (Nouveau prospect → Tentative de contact → Contact établi → RDV planifié → RDV réalisé → Proposition envoyée → Gagné → Perdu), créé automatiquement via API (id `3625113819`)
- **Création automatique de Deal** : à chaque envoi depuis Decidento, un deal est créé dans le pipeline avec le stage correspondant au statut sélectionné, associé au contact et à l'entreprise
- **Date picker RDV** : apparaît conditionnellement quand le statut "Rendez-vous pris" est sélectionné
- **Checkbox "Envoyer mail de confirmation de RDV"** : apparaît avec le date picker
- **Checkbox "Envoyer mail de présentation de l'offre"** : toujours visible dans le formulaire
- **Tâche de rappel automatique** : si statut = message vocal / injoignable / email envoyé → tâche HubSpot créée à J+3, assignée au commercial
- **Tâche RDV automatique** : si une date de RDV est renseignée → tâche HubSpot créée à la date du RDV
- **5 nouveaux nœuds n8n** : "Créer Deal Prospection", "Tâche rappel ?", "Créer tâche rappel J+3", "RDV tâche ?", "Créer tâche RDV" → workflow passe de 19 à 24 nœuds

### Modifié
- Le payload envoyé au webhook inclut désormais `rdv_date`, `send_confirmation_email`, `send_offer_email`
- Le nœud "Préparer les données" inclut le mapping statut → stage pipeline (`pipeline_stage_id`)
- Version de l'extension passe à 1.3.0

## [1.2.0] - 2026-03-05

### Ajouté
- **Champ Téléphone** : pré-rempli avec le numéro du standard de l'entreprise, modifiable par le commercial pour saisir le numéro direct du contact
- **Champ Email** : pré-rempli si un email est détecté sur la fiche contact Decidento, sinon vide avec placeholder "Aucun email détecté"
- **Champ Notes** : textarea libre pour prendre des notes pendant l'appel (optionnel)
- **Création de note HubSpot** : si des notes sont saisies, une note est automatiquement créée et associée au contact dans HubSpot avec le statut, le commercial et la date
- **2 nouveaux nœuds n8n** : "Notes présentes ?" (condition IF) et "Créer note HubSpot" → workflow passe de 17 à 19 nœuds

### Modifié
- Le payload envoyé au webhook inclut désormais `contact.phone`, `contact.email` (overridé) et `notes`
- Les nœuds "Créer contact" et "Mettre à jour contact" envoient le téléphone du contact à HubSpot (`phone`)
- Mise en page du formulaire : les champs téléphone/email sont au-dessus de la ligne statut/commercial

## [1.1.0] - 2026-03-05

### Ajouté
- **Chargement dynamique des commerciaux** : nouveau webhook GET `/formaxe-owners` qui récupère la liste des owners HubSpot
- **Cache owners** : les commerciaux sont mis en cache dans `chrome.storage` pour fonctionner hors-ligne
- **Fallback 3 niveaux** : webhook HubSpot → cache local → liste par défaut codée en dur
- **Workflow n8n owners** : nouveau workflow (4 nœuds) `WC48icj2VTGxhRd7` pour servir la liste des owners
- **Action `fetchWebhook`** dans le background service worker pour les requêtes GET

### Modifié
- `COMMERCIAUX` passe de `const` à `let` (mutable, alimenté dynamiquement)
- Le badge de statut résout le nom du commercial depuis le cache owners (par `owner_id`) au lieu d'un mapping statique
- Le nœud "Préparer les données" génère `commercial_enum` dynamiquement via `toSnakeCase()` au lieu d'un mapping codé en dur

## [1.0.0] - 2026-03-05

### Ajouté
- **Content Script** : injection automatique d'un bouton "Envoyer vers HubSpot" sous chaque bloc contact sur Decidento
- **Extraction de données contact** : nom, poste, adresse, titre hiérarchique, URL LinkedIn, email
- **Extraction de données entreprise** : raison sociale, SIREN, adresse, téléphone, site internet
- **Upsert contact** : création ou mise à jour automatique du contact dans HubSpot (via `decidento_contact_id`)
- **Upsert entreprise** : recherche par SIREN, création si inexistante
- **Association automatique** : liaison contact ↔ entreprise dans HubSpot
- **Assignation owner** : le commercial sélectionné est assigné comme propriétaire HubSpot du contact
- **Badge de statut** : affichage en temps réel du statut de prospection pour les contacts déjà dans HubSpot (date, statut, nom du commercial)
- **Anti rate-limit** : envois décalés de 350ms pour éviter les erreurs 429 HubSpot
- **Mini-formulaire** inline avec sélection du statut de prospection et du commercial
- **Envoi webhook** : POST JSON vers n8n Cloud (workflow principal + workflow de vérification)
- **Background Service Worker** : proxy des appels réseau (contournement CORS)
- **Popup** : affichage de l'état de l'extension et du nombre de contacts détectés
- **Page d'options** : configuration de l'URL du webhook et du commercial par défaut
- **MutationObserver** : détection dynamique des nouveaux contacts (SPA)
- **Mémorisation** du dernier commercial sélectionné via Chrome Storage
- **Charte graphique** Formaxe : couleurs #54B6B4 / #07163C, logo intégré
- **Workflows n8n** : 2 workflows (envoi 17 nœuds + vérification 4 nœuds) inclus en JSON
