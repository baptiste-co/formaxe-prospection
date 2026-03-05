#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Formaxe - Acquisition | HubSpot Custom Properties Setup
# ═══════════════════════════════════════════════════════════════════
#
# Ce script crée les propriétés custom nécessaires dans HubSpot.
#
# PRÉREQUIS :
# - Un PAT (Private App Token) HubSpot avec les scopes :
#   • crm.schemas.companies.write
#   • crm.schemas.contacts.write
#   • crm.objects.companies.write
#   • crm.objects.contacts.write
#
# USAGE :
#   chmod +x create-properties.sh
#   ./create-properties.sh pat-eu1-VOTRE-TOKEN-ICI
#
# ═══════════════════════════════════════════════════════════════════

TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "❌ Usage: ./create-properties.sh <HUBSPOT_PAT_TOKEN>"
  exit 1
fi

API="https://api.hubapi.com"
HEADERS=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

echo "═══ Formaxe - Création des propriétés HubSpot ═══"
echo ""

# ── COMPANY PROPERTIES ──

echo "📦 Création des propriétés COMPANY..."

# 1. SIREN
echo -n "  → SIREN... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "siren",
    "label": "SIREN",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Numéro SIREN (9 chiffres) - Identifiant unique entreprise"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 2. SIRET du siège
echo -n "  → SIRET du siège... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "siret_siege",
    "label": "SIRET du siège",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Numéro SIRET du siège social (14 chiffres)"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 3. Type entreprise
echo -n "  → Type entreprise... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "type_entreprise",
    "label": "Type entreprise",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Type entreprise (ETI, PME, GE, TPE, etc.)"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 4. Numéro TVA
echo -n "  → Numéro TVA... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "numero_tva",
    "label": "Numéro TVA",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Numéro de TVA intracommunautaire"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 5. Capital social
echo -n "  → Capital social... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "capital_social",
    "label": "Capital social",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Capital social de l entreprise"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 6. Forme juridique
echo -n "  → Forme juridique... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "forme_juridique",
    "label": "Forme juridique",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Forme juridique (SAS, SARL, SA, etc.)"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 7. Chiffre d'affaires Decidento
echo -n "  → CA (Decidento)... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "ca_decidento",
    "label": "CA (Decidento)",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Chiffre d affaires tel que renseigné sur Decidento"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 8. Effectif
echo -n "  → Effectif... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "effectif_decidento",
    "label": "Effectif (Decidento)",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Effectif tel que renseigné sur Decidento"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 9. Convention collective
echo -n "  → Convention collective... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "convention_collective",
    "label": "Convention collective",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "Convention collective de l entreprise"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 10. Source Decidento URL
echo -n "  → Source Decidento URL... "
curl -s -X POST "$API/crm/v3/properties/companies" "${HEADERS[@]}" \
  -d '{
    "name": "source_decidento_url",
    "label": "URL Decidento",
    "type": "string",
    "fieldType": "text",
    "groupName": "companyinformation",
    "description": "URL de la fiche entreprise sur Decidento"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

echo ""
echo "👤 Création des propriétés CONTACT..."

# ── CONTACT PROPERTIES ──

# 1. Statut prospection Decidento
echo -n "  → Statut prospection... "
curl -s -X POST "$API/crm/v3/properties/contacts" "${HEADERS[@]}" \
  -d '{
    "name": "statut_prospection_decidento",
    "label": "Statut prospection (Decidento)",
    "type": "enumeration",
    "fieldType": "select",
    "groupName": "contactinformation",
    "description": "Statut de prospection remonté depuis Decidento via Formaxe",
    "options": [
      {"label": "Message vocal laissé", "value": "message_vocal_laisse", "displayOrder": 1},
      {"label": "Email envoyé", "value": "email_envoye", "displayOrder": 2},
      {"label": "Injoignable", "value": "injoignable", "displayOrder": 3},
      {"label": "Rendez-vous pris", "value": "rendez_vous_pris", "displayOrder": 4},
      {"label": "Ne plus rappeler", "value": "ne_plus_rappeler", "displayOrder": 5},
      {"label": "Déjà appelé", "value": "deja_appele", "displayOrder": 6},
      {"label": "Pas intéressé", "value": "pas_interesse", "displayOrder": 7},
      {"label": "Déjà en partenariat", "value": "deja_en_partenariat", "displayOrder": 8},
      {"label": "A raccroché", "value": "a_raccroche", "displayOrder": 9}
    ]
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 2. Commercial Decidento
echo -n "  → Commercial... "
curl -s -X POST "$API/crm/v3/properties/contacts" "${HEADERS[@]}" \
  -d '{
    "name": "commercial_decidento",
    "label": "Commercial (Decidento)",
    "type": "enumeration",
    "fieldType": "select",
    "groupName": "contactinformation",
    "description": "Commercial ayant prospecté ce contact via Decidento",
    "options": [
      {"label": "Baptiste Cordier", "value": "baptiste_cordier", "displayOrder": 1},
      {"label": "Louis Prezeau", "value": "louis_prezeau", "displayOrder": 2}
    ]
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 3. Titre/Fonction Decidento
echo -n "  → Titre Decidento... "
curl -s -X POST "$API/crm/v3/properties/contacts" "${HEADERS[@]}" \
  -d '{
    "name": "titre_decidento",
    "label": "Titre (Decidento)",
    "type": "string",
    "fieldType": "text",
    "groupName": "contactinformation",
    "description": "Tag de titre du contact sur Decidento (ex: Dirigeant opérationnel)"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

# 4. Source Decidento URL (contact)
echo -n "  → Source Decidento URL... "
curl -s -X POST "$API/crm/v3/properties/contacts" "${HEADERS[@]}" \
  -d '{
    "name": "source_decidento_url",
    "label": "URL Decidento",
    "type": "string",
    "fieldType": "text",
    "groupName": "contactinformation",
    "description": "URL de la page Decidento d où le contact a été extrait"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅' if 'name' in d else f'⚠️  {d.get(\"message\",d)}')" 2>/dev/null || echo "❌ Erreur"

echo ""
echo "═══ Terminé ! ═══"
echo ""
echo "Propriétés créées :"
echo "  COMPANY : siren, siret_siege, type_entreprise, numero_tva, capital_social,"
echo "            forme_juridique, ca_decidento, effectif_decidento, convention_collective,"
echo "            source_decidento_url"
echo "  CONTACT : statut_prospection_decidento, commercial_decidento, titre_decidento,"
echo "            source_decidento_url"
