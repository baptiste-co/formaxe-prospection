# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.0] - 2026-03-05

### Ajouté
- **Content Script** : injection automatique d'un bouton "Formaxe" sous chaque bloc contact sur Decidento
- **Extraction de données contact** : nom, poste, adresse, titre hiérarchique, URL LinkedIn, email
- **Extraction de données entreprise** : raison sociale, adresse, téléphone, site internet
- **Mini-formulaire** inline avec sélection du statut d'appel et du commercial
- **Envoi webhook** : POST JSON vers l'URL configurable (par défaut n8n)
- **Popup** : affichage de l'état de l'extension et du nombre de contacts détectés
- **Page d'options** : configuration de l'URL du webhook
- **MutationObserver** : détection dynamique des nouveaux contacts (SPA)
- **Mémorisation** du dernier commercial sélectionné via Chrome Storage
- **Charte graphique** Formaxe : couleurs #54B6B4 / #07163C, logo intégré
- **Feedback visuel** : confirmation d'envoi (succès/erreur) avec auto-fermeture
