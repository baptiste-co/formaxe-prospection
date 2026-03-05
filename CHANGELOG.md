# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

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
