# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

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
