/**
 * Formaxe - Acquisition | Content Script
 * Version: 1.0.0
 * Developed by Gripow
 *
 * Injects extraction buttons under each contact block on Decidento platform.
 */

(function () {
  'use strict';

  const VERSION = '1.6.0';
  const WEBHOOK_DEFAULT = 'https://getgarsen.app.n8n.cloud/webhook/decidento';

  const STATUS_OPTIONS = [
    'Message vocal laissé',
    'Injoignable',
    'Rendez-vous pris',
    'Ne plus rappeler',
    'Déjà appelé',
    'Pas intéressé',
    'Déjà en partenariat',
    'A raccroché',
    'Pas de besoin immédiat - rappel'
  ];

  const RAPPEL_DELAI_OPTIONS = [
    { label: '1 mois', value: 1 },
    { label: '2 mois', value: 2 },
    { label: '3 mois', value: 3 },
    { label: '4 mois', value: 4 },
    { label: '5 mois', value: 5 },
    { label: '6 mois', value: 6 },
    { label: '7 mois', value: 7 },
    { label: '8 mois', value: 8 },
    { label: '9 mois', value: 9 },
    { label: '10 mois', value: 10 },
    { label: '11 mois', value: 11 },
    { label: '12 mois', value: 12 },
    { label: 'Date personnalisée', value: 'custom' }
  ];

  const EMAIL_TEMPLATE_OPTIONS = [
    { label: 'Mail de présentation de l\'offre', value: 'presentation_offre' },
    { label: 'Mail appel sans réponse', value: 'appel_sans_reponse' }
  ];

  // Liste de commerciaux par défaut (fallback si le webhook owners échoue)
  let COMMERCIAUX = [
    'Baptiste Cordier',
    'Louis Prezeau'
  ];

  const CHECK_WEBHOOK_PATH = 'formaxe-check';
  const OWNERS_WEBHOOK_PATH = 'formaxe-owners';

  // Cache des owners chargés dynamiquement depuis HubSpot
  let OWNERS_CACHE = null;

  // ── Utility: fetch owners list from n8n webhook ──
  async function fetchOwnersFromHubSpot() {
    try {
      const { webhookUrl } = await chrome.storage.local.get(['webhookUrl']);
      const baseUrl = (webhookUrl || WEBHOOK_DEFAULT).replace(/\/[^\/]*$/, '');
      const ownersUrl = baseUrl + '/' + OWNERS_WEBHOOK_PATH;

      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'fetchWebhook', url: ownersUrl },
          (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              resolve(null);
            } else {
              try {
                const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
                if (data && data.owners && Array.isArray(data.owners)) {
                  resolve(data.owners);
                } else {
                  resolve(null);
                }
              } catch (e) {
                resolve(null);
              }
            }
          }
        );
      });
    } catch (e) {
      return null;
    }
  }

  // ── Load owners on startup and cache them ──
  async function loadOwners() {
    const owners = await fetchOwnersFromHubSpot();
    if (owners && owners.length > 0) {
      OWNERS_CACHE = owners;
      COMMERCIAUX = owners.map(o => o.name);
      // Save to storage for offline fallback
      chrome.storage.local.set({ cachedOwners: owners });
      console.log(`[Formaxe] ${owners.length} commerciaux chargés depuis HubSpot`);
    } else {
      // Try loading from cache
      const { cachedOwners } = await chrome.storage.local.get(['cachedOwners']);
      if (cachedOwners && cachedOwners.length > 0) {
        OWNERS_CACHE = cachedOwners;
        COMMERCIAUX = cachedOwners.map(o => o.name);
        console.log(`[Formaxe] ${cachedOwners.length} commerciaux chargés depuis le cache`);
      } else {
        console.log('[Formaxe] Utilisation de la liste de commerciaux par défaut');
      }
    }
  }

  // ── Utility: generate a deterministic contact ID from SIREN + name ──
  function generateContactId(siren, contactName) {
    const raw = (siren || '').trim() + '::' + (contactName || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Simple hash (djb2)
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash) + raw.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'fx_' + Math.abs(hash).toString(36);
  }

  // ── Utility: check if contact exists in HubSpot via n8n check webhook ──
  async function checkContactInHubSpot(decidentoContactId) {
    try {
      const { webhookUrl } = await chrome.storage.local.get(['webhookUrl']);
      const baseUrl = (webhookUrl || WEBHOOK_DEFAULT).replace(/\/[^\/]*$/, '');
      const checkUrl = baseUrl + '/' + CHECK_WEBHOOK_PATH;

      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'checkContact', url: checkUrl, decidentoContactId },
          (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              resolve(null);
            } else {
              try {
                const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
                resolve(data);
              } catch (e) {
                resolve(null);
              }
            }
          }
        );
      });
    } catch (e) {
      return null;
    }
  }

  // ── Utility: inject status badge on a contact bloc ──
  function injectStatusBadge(bloc, statusData) {
    // Remove existing badge if any
    const existing = bloc.querySelector('.formaxe-status-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.className = 'formaxe-status-badge';

    if (statusData && statusData.exists) {
      const lastDate = statusData.last_date ? new Date(statusData.last_date).toLocaleDateString('fr-FR') : '';
      const statusText = statusData.last_status || '';
      // Résoudre le nom du commercial depuis le cache owners ou fallback sur la valeur brute
      let commercialName = statusData.commercial || '';
      if (OWNERS_CACHE && statusData.owner_id) {
        const ownerMatch = OWNERS_CACHE.find(o => o.id === String(statusData.owner_id));
        if (ownerMatch) {
          commercialName = ownerMatch.name.split(' ')[0]; // Prénom seulement
        }
      }
      // Fallback: nettoyer les valeurs enum (snake_case → Prénom)
      if (commercialName.includes('_')) {
        commercialName = commercialName.split('_')[0];
        commercialName = commercialName.charAt(0).toUpperCase() + commercialName.slice(1);
      }
      badge.classList.add('formaxe-status-contacted');
      badge.innerHTML = `<span class="formaxe-status-dot formaxe-dot-green"></span> Contacté${lastDate ? ' le ' + lastDate : ''}${statusText ? ' — ' + statusText : ''}${commercialName ? ' par ' + commercialName : ''}`;
    } else {
      badge.classList.add('formaxe-status-new');
      badge.innerHTML = '<span class="formaxe-status-dot formaxe-dot-red"></span> Jamais contacté';
    }

    // Insert at the top of the contact bloc
    bloc.style.position = 'relative';
    bloc.insertBefore(badge, bloc.firstChild);
  }

  // ── Utility: get logo URL ──
  function getLogoURL() {
    return chrome.runtime.getURL('images/logo.png');
  }

  // ── Helper: extract a value from the Identité section by label ──
  function extractIdentiteField(label) {
    // Search in #identite or #id-details sections
    const identiteSection = document.querySelector('#identite, #id-details, .identite-section');
    const searchArea = identiteSection || document;

    // Strategy 1: Look for <strong> tags containing the label
    const strongs = searchArea.querySelectorAll('strong');
    for (const strong of strongs) {
      const text = strong.textContent?.replace(/\u00a0/g, ' ').trim();
      if (text.toLowerCase().includes(label.toLowerCase())) {
        // The value is in the next sibling text node or element
        const parent = strong.parentElement;
        if (parent) {
          // Clone the parent, remove the <strong>, get remaining text
          const clone = parent.cloneNode(true);
          const strongClone = clone.querySelector('strong');
          if (strongClone) strongClone.remove();
          // Check for span with class (e.g., millier-separator)
          const span = clone.querySelector('span');
          if (span) {
            return span.textContent?.replace(/\s+/g, '').trim() || '';
          }
          return clone.textContent?.replace(/\u00a0/g, ' ').trim() || '';
        }
      }
    }

    // Strategy 2: Look in <li> or <p> elements containing the label text
    const allElements = searchArea.querySelectorAll('li, p, div');
    for (const el of allElements) {
      const fullText = el.textContent?.replace(/\u00a0/g, ' ') || '';
      if (fullText.toLowerCase().includes(label.toLowerCase())) {
        // Extract value after the colon
        const parts = fullText.split(':');
        if (parts.length >= 2) {
          return parts.slice(1).join(':').trim();
        }
      }
    }

    return '';
  }

  // ── Extract company data from the page header + Identité section ──
  function extractCompanyData() {
    const company = {};

    // Company name from h1
    const h1 = document.querySelector('h1.text--primary.text--big-bold');
    if (h1) {
      company.name = h1.childNodes[0]?.textContent?.trim() || '';
    }

    // Address - look for the Google Maps link
    const mapLink = document.querySelector('a[href*="google.com/maps"]');
    if (mapLink) {
      company.address = mapLink.textContent?.trim() || '';
    }

    // Phone - look for tel: link within the company header area
    const companySection = document.querySelector('.contact-societe, .d-md-flex.align-items-center.contact-societe');
    if (companySection) {
      const telLink = companySection.querySelector('a[href^="tel:"]');
      if (telLink) {
        company.phone = telLink.textContent?.trim() || telLink.getAttribute('href')?.replace('tel:', '') || '';
      }
    }
    // Fallback: search in phone button areas
    if (!company.phone) {
      const phoneSpans = document.querySelectorAll('.js-tel a[href^="tel:"]');
      if (phoneSpans.length > 0) {
        company.phone = phoneSpans[0].textContent?.trim() || phoneSpans[0].getAttribute('href')?.replace('tel:', '') || '';
      }
    }

    // Website
    const siteLink = document.querySelector('.site-link a[target="_blank"]');
    if (siteLink) {
      company.website = siteLink.getAttribute('href') || siteLink.textContent?.trim() || '';
    }

    // ── Identité section data ──
    company.siret = extractIdentiteField('SIRET du siège').replace(/\s+/g, '');
    company.siren = extractIdentiteField('SIREN').replace(/\s+/g, '');
    company.type_entreprise = extractIdentiteField('Type');
    company.effectif = extractIdentiteField('Effectif');
    company.chiffre_affaires = extractIdentiteField('CA');
    company.capital_social = extractIdentiteField('Capital social');
    company.forme_juridique = extractIdentiteField('Forme juridique');
    company.numero_tva = extractIdentiteField('Numéro TVA').replace(/\s+/g, '');
    company.date_creation = extractIdentiteField('Date de création');
    company.convention_collective = extractIdentiteField('Convention collective');

    return company;
  }

  // ── Extract contact data from a contact-bloc element ──
  function extractContactData(contactBloc) {
    const data = {};

    // Name - from the bold name paragraph
    const nameParagraph = contactBloc.querySelector('.contact-details p.font-weight-bold');
    if (nameParagraph) {
      const nameText = nameParagraph.childNodes[0]?.textContent?.trim();
      data.name = nameText || '';
    }

    // Split name into firstname / lastname
    if (data.name) {
      const parts = data.name.split(' ');
      data.firstname = parts[0] || '';
      data.lastname = parts.slice(1).join(' ') || '';
    } else {
      data.firstname = '';
      data.lastname = '';
    }

    // Position/Role - second paragraph in contact-details
    const detailsPs = contactBloc.querySelectorAll('.contact-details > p');
    if (detailsPs.length >= 2) {
      const posNode = detailsPs[1].childNodes[0]?.textContent?.trim();
      data.position = posNode || '';
    }

    // Address (city info) - third paragraph with text-muted
    const mutedP = contactBloc.querySelector('.contact-details p.text-muted');
    if (mutedP) {
      data.address = mutedP.textContent?.trim() || '';
    }

    // Title tag (e.g., "Dirigeant opérationnel")
    const tagSpan = contactBloc.querySelector('.contact-tag');
    if (tagSpan) {
      data.title_tag = tagSpan.textContent?.trim() || '';
    }

    // Phone - from the yellow phone button within or near the contact bloc
    const phoneBtn = contactBloc.querySelector('.phone-btn .js-tel a');
    if (phoneBtn) {
      data.phone = phoneBtn.getAttribute('tcxhref') || phoneBtn.textContent?.trim() || '';
    }
    // Fallback: look for any tel link in the contact bloc
    if (!data.phone) {
      const telLink = contactBloc.querySelector('a[href^="tel:"]');
      if (telLink) {
        data.phone = telLink.textContent?.trim() || telLink.getAttribute('href')?.replace('tel:', '') || '';
      }
    }

    // Email
    const contactInfoSection = contactBloc.querySelector('.contact-info');
    if (contactInfoSection) {
      const emailLink = contactInfoSection.querySelector('a[href^="mailto:"]');
      if (emailLink && !emailLink.classList.contains('disabled-link')) {
        data.email = emailLink.getAttribute('href')?.replace('mailto:', '') || '';
      } else {
        const emailText = contactInfoSection.querySelector('.contact-mail');
        if (emailText) {
          const emailVal = emailText.textContent?.trim();
          if (emailVal && !emailVal.includes('Aucun email')) {
            data.email = emailVal;
          } else {
            data.email = '';
          }
        }
      }

      // LinkedIn
      const linkedinLink = contactInfoSection.querySelector('a[href*="linkedin.com"]');
      if (linkedinLink) {
        data.linkedin_url = linkedinLink.getAttribute('href') || '';
      }
    }

    return data;
  }

  // ── Create the mini-form HTML ──
  function createMiniForm(contactData, companyData) {
    const form = document.createElement('div');
    form.className = 'formaxe-form-container';

    // Pré-remplir le téléphone : celui du contact (bouton phone) sinon entreprise
    const defaultPhone = contactData.phone || companyData.phone || '';
    const phoneHint = contactData.phone ? 'Numéro du contact (Decidento)' : 'Standard de l\'entreprise';
    const defaultEmail = contactData.email || '';

    form.innerHTML = `
      <div class="formaxe-form-header">
        <img src="${getLogoURL()}" alt="Formaxe" class="formaxe-form-logo">
        <span class="formaxe-form-title">Formaxe - Acquisition</span>
      </div>
      <div class="formaxe-form-editable-section">
        <div class="formaxe-form-row formaxe-form-row-fields">
          <div class="formaxe-form-group">
            <label class="formaxe-form-label">Prénom</label>
            <input type="text" class="formaxe-form-input formaxe-input-firstname" value="${contactData.firstname || ''}" placeholder="Prénom">
          </div>
          <div class="formaxe-form-group">
            <label class="formaxe-form-label">Nom</label>
            <input type="text" class="formaxe-form-input formaxe-input-lastname" value="${contactData.lastname || ''}" placeholder="Nom">
          </div>
          <div class="formaxe-form-group">
            <label class="formaxe-form-label">Poste</label>
            <input type="text" class="formaxe-form-input formaxe-input-position" value="${contactData.position || ''}" placeholder="Fonction">
          </div>
        </div>
        <div class="formaxe-form-contact-summary">
          ${companyData.name ? '<strong>' + companyData.name + '</strong>' : ''}
          ${contactData.title_tag ? ' — ' + contactData.title_tag : ''}
          ${companyData.siren ? ' <span class="formaxe-siren-badge">SIREN ' + companyData.siren + '</span>' : ''}
        </div>
      </div>
      <div class="formaxe-form-row formaxe-form-row-fields">
        <div class="formaxe-form-group">
          <label class="formaxe-form-label">Téléphone</label>
          <input type="tel" class="formaxe-form-input formaxe-input-phone" value="${defaultPhone}" placeholder="Numéro de téléphone">
          <span class="formaxe-form-hint">${phoneHint}</span>
        </div>
        <div class="formaxe-form-group">
          <label class="formaxe-form-label">Email</label>
          <input type="email" class="formaxe-form-input formaxe-input-email" value="${defaultEmail}" placeholder="${defaultEmail ? '' : 'Aucun email détecté'}">
          <span class="formaxe-form-hint">${defaultEmail ? 'Email détecté sur Decidento' : 'Saisir l\'email si obtenu'}</span>
        </div>
      </div>
      <div class="formaxe-form-row formaxe-form-row-selects">
        <div class="formaxe-form-group">
          <label class="formaxe-form-label">Statut</label>
          <select class="formaxe-form-select formaxe-select-status">
            <option value="">-- Choisir un statut --</option>
            ${STATUS_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="formaxe-form-group">
          <label class="formaxe-form-label">Je suis</label>
          <select class="formaxe-form-select formaxe-select-commercial">
            <option value="">-- Commercial --</option>
            ${COMMERCIAUX.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <button class="formaxe-send-btn" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          Envoyer
        </button>
      </div>
      <div class="formaxe-rappel-section" style="display:none;">
        <div class="formaxe-form-row formaxe-form-row-fields">
          <div class="formaxe-form-group">
            <label class="formaxe-form-label">Rappeler dans</label>
            <select class="formaxe-form-select formaxe-select-rappel-delai">
              <option value="">-- Délai de rappel --</option>
              ${RAPPEL_DELAI_OPTIONS.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
            </select>
          </div>
          <div class="formaxe-form-group formaxe-rappel-custom-date" style="display:none;">
            <label class="formaxe-form-label">Date de rappel</label>
            <input type="date" class="formaxe-form-input formaxe-input-rappel-date">
          </div>
        </div>
      </div>
      <div class="formaxe-rdv-section" style="display:none;">
        <div class="formaxe-form-row formaxe-form-row-fields">
          <div class="formaxe-form-group">
            <label class="formaxe-form-label">Date du rendez-vous</label>
            <input type="datetime-local" class="formaxe-form-input formaxe-input-rdv-date">
          </div>
        </div>
        <div class="formaxe-form-row formaxe-form-row-checkboxes">
          <label class="formaxe-checkbox-label">
            <input type="checkbox" class="formaxe-checkbox formaxe-check-confirmation">
            <span>Envoyer mail de confirmation de RDV + présentation</span>
          </label>
        </div>
        <div class="formaxe-rdv-brochure-wrapper" style="display:none;">
          <div class="formaxe-form-group">
            <label class="formaxe-form-label">Pièce jointe</label>
            <select class="formaxe-form-select formaxe-select-rdv-brochure">
              <option value="">-- Choisir une brochure --</option>
              <option value="brochure_generique">Brochure générique</option>
              <option value="brochure_agence_web">Brochure agence web</option>
              <option value="brochure_expert_comptable">Brochure expert comptable</option>
              <option value="brochure_esn">Brochure ESN</option>
            </select>
          </div>
        </div>
      </div>
      <div class="formaxe-email-section" style="display:none;">
        <div class="formaxe-form-row formaxe-form-row-checkboxes">
          <label class="formaxe-checkbox-label">
            <input type="checkbox" class="formaxe-checkbox formaxe-check-send-email">
            <span>Envoyer un email</span>
          </label>
        </div>
        <div class="formaxe-email-options-wrapper" style="display:none;">
          <div class="formaxe-form-row formaxe-form-row-fields">
            <div class="formaxe-form-group">
              <label class="formaxe-form-label">Type d'email</label>
              <select class="formaxe-form-select formaxe-select-email-template">
                ${EMAIL_TEMPLATE_OPTIONS.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="formaxe-form-group formaxe-brochure-select-wrapper" style="display:none;">
              <label class="formaxe-form-label">Pièce jointe</label>
              <select class="formaxe-form-select formaxe-select-brochure">
                <option value="">-- Choisir une brochure --</option>
                <option value="brochure_generique">Brochure générique</option>
                <option value="brochure_agence_web">Brochure agence web</option>
                <option value="brochure_expert_comptable">Brochure expert comptable</option>
                <option value="brochure_esn">Brochure ESN</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="formaxe-form-group formaxe-form-group-notes">
        <label class="formaxe-form-label">Notes</label>
        <textarea class="formaxe-form-textarea formaxe-input-notes" rows="3" placeholder="Notes de l'appel (optionnel)..."></textarea>
      </div>
      <div class="formaxe-feedback"></div>
      <div class="formaxe-webhook-config">
        <label class="formaxe-form-label">Webhook URL</label>
        <div class="formaxe-webhook-row">
          <input type="url" class="formaxe-webhook-input" placeholder="https://votre-webhook.com/endpoint">
          <button class="formaxe-webhook-save-btn" title="Sauvegarder l'URL">OK</button>
        </div>
      </div>
      <div class="formaxe-form-footer">
        <span class="formaxe-form-version">v${VERSION}</span>
        <span class="formaxe-form-dev">Developed by Gripow</span>
      </div>
    `;

    // ── Webhook config ──
    const webhookInput = form.querySelector('.formaxe-webhook-input');
    const webhookSaveBtn = form.querySelector('.formaxe-webhook-save-btn');

    chrome.storage.local.get(['webhookUrl'], (result) => {
      webhookInput.value = result.webhookUrl || WEBHOOK_DEFAULT;
    });

    webhookSaveBtn.addEventListener('click', () => {
      const url = webhookInput.value.trim();
      if (url) {
        chrome.storage.local.set({ webhookUrl: url });
        webhookSaveBtn.textContent = '\u2713';
        setTimeout(() => { webhookSaveBtn.textContent = 'OK'; }, 1500);
      }
    });

    // References to fields
    const firstnameInput = form.querySelector('.formaxe-input-firstname');
    const lastnameInput = form.querySelector('.formaxe-input-lastname');
    const positionInput = form.querySelector('.formaxe-input-position');
    const phoneInput = form.querySelector('.formaxe-input-phone');
    const emailInput = form.querySelector('.formaxe-input-email');
    const notesInput = form.querySelector('.formaxe-input-notes');

    // RDV section
    const rdvSection = form.querySelector('.formaxe-rdv-section');
    const rdvDateInput = form.querySelector('.formaxe-input-rdv-date');
    const checkConfirmation = form.querySelector('.formaxe-check-confirmation');
    const rdvBrochureWrapper = form.querySelector('.formaxe-rdv-brochure-wrapper');
    const rdvBrochureSelect = form.querySelector('.formaxe-select-rdv-brochure');

    // Rappel section
    const rappelSection = form.querySelector('.formaxe-rappel-section');
    const rappelDelaiSelect = form.querySelector('.formaxe-select-rappel-delai');
    const rappelCustomDateGroup = form.querySelector('.formaxe-rappel-custom-date');
    const rappelDateInput = form.querySelector('.formaxe-input-rappel-date');

    // Email section (for non-RDV statuses)
    const emailSection = form.querySelector('.formaxe-email-section');
    const checkSendEmail = form.querySelector('.formaxe-check-send-email');
    const emailOptionsWrapper = form.querySelector('.formaxe-email-options-wrapper');
    const emailTemplateSelect = form.querySelector('.formaxe-select-email-template');
    const brochureSelectWrapper = form.querySelector('.formaxe-brochure-select-wrapper');
    const brochureSelect = form.querySelector('.formaxe-select-brochure');

    // RDV: show/hide brochure when confirmation checkbox is toggled
    checkConfirmation.addEventListener('change', () => {
      rdvBrochureWrapper.style.display = checkConfirmation.checked ? 'block' : 'none';
      if (!checkConfirmation.checked) rdvBrochureSelect.value = '';
    });

    // Email section: show/hide options when checkbox is toggled
    checkSendEmail.addEventListener('change', () => {
      emailOptionsWrapper.style.display = checkSendEmail.checked ? 'block' : 'none';
      if (!checkSendEmail.checked) {
        emailTemplateSelect.value = 'presentation_offre';
        brochureSelectWrapper.style.display = 'none';
        brochureSelect.value = '';
      } else {
        brochureSelectWrapper.style.display = emailTemplateSelect.value === 'presentation_offre' ? 'block' : 'none';
      }
    });

    // Show/hide brochure depending on email template
    emailTemplateSelect.addEventListener('change', () => {
      brochureSelectWrapper.style.display = emailTemplateSelect.value === 'presentation_offre' ? 'block' : 'none';
      if (emailTemplateSelect.value !== 'presentation_offre') brochureSelect.value = '';
    });

    // Show/hide rappel custom date
    rappelDelaiSelect.addEventListener('change', () => {
      rappelCustomDateGroup.style.display = rappelDelaiSelect.value === 'custom' ? 'block' : 'none';
      if (rappelDelaiSelect.value !== 'custom') rappelDateInput.value = '';
    });

    // Enable send button only when both dropdowns are selected
    const statusSelect = form.querySelector('.formaxe-select-status');
    const commercialSelect = form.querySelector('.formaxe-select-commercial');
    const sendBtn = form.querySelector('.formaxe-send-btn');
    const feedbackDiv = form.querySelector('.formaxe-feedback');

    function checkSelections() {
      sendBtn.disabled = !(statusSelect.value && commercialSelect.value);
    }

    // Reset helper
    function resetEmailSections() {
      // Reset RDV email
      checkConfirmation.checked = false;
      rdvBrochureWrapper.style.display = 'none';
      rdvBrochureSelect.value = '';
      // Reset standalone email
      checkSendEmail.checked = false;
      emailOptionsWrapper.style.display = 'none';
      emailTemplateSelect.value = 'presentation_offre';
      brochureSelectWrapper.style.display = 'none';
      brochureSelect.value = '';
    }

    // Show/hide sections based on status selection
    statusSelect.addEventListener('change', () => {
      checkSelections();
      resetEmailSections();

      // RDV section (includes its own email confirmation + brochure)
      if (statusSelect.value === 'Rendez-vous pris') {
        rdvSection.style.display = 'block';
        emailSection.style.display = 'none';
      } else {
        rdvSection.style.display = 'none';
        rdvDateInput.value = '';
        // Show standalone email section for all other statuses
        emailSection.style.display = 'block';
      }

      // Rappel section
      if (statusSelect.value === 'Pas de besoin immédiat - rappel') {
        rappelSection.style.display = 'block';
      } else {
        rappelSection.style.display = 'none';
        rappelDelaiSelect.value = '';
        rappelDateInput.value = '';
        rappelCustomDateGroup.style.display = 'none';
      }
    });
    commercialSelect.addEventListener('change', checkSelections);

    // Remember last commercial selection
    chrome.storage.local.get(['lastCommercial'], (result) => {
      if (result.lastCommercial) {
        commercialSelect.value = result.lastCommercial;
        checkSelections();
      }
    });

    // ── Helper: compute rappel date from delay in months ──
    function computeRappelDate() {
      const delai = rappelDelaiSelect.value;
      if (!delai) return '';
      if (delai === 'custom') return rappelDateInput.value || '';
      const date = new Date();
      date.setMonth(date.getMonth() + parseInt(delai, 10));
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Send button click
    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Envoi...';

      // Save commercial preference
      chrome.storage.local.set({ lastCommercial: commercialSelect.value });

      // Use editable name fields
      const currentFirstname = firstnameInput.value.trim();
      const currentLastname = lastnameInput.value.trim();
      const currentName = (currentFirstname + ' ' + currentLastname).trim();
      const decidentoContactId = generateContactId(companyData.siren, currentName || contactData.name);

      // Determine email flags depending on context
      const isRdv = statusSelect.value === 'Rendez-vous pris';
      const sendConfirmation = isRdv && checkConfirmation.checked;
      const sendStandaloneEmail = !isRdv && checkSendEmail.checked;
      const emailTemplate = sendStandaloneEmail ? emailTemplateSelect.value : (sendConfirmation ? 'confirmation_rdv' : '');
      const sendOfferEmail = sendStandaloneEmail && emailTemplateSelect.value === 'presentation_offre';
      const sendAppelSansReponse = sendStandaloneEmail && emailTemplateSelect.value === 'appel_sans_reponse';
      // Brochure: from RDV section OR from standalone email section
      const selectedBrochure = isRdv ? rdvBrochureSelect.value : (sendOfferEmail ? brochureSelect.value : '');

      const payload = {
        timestamp: new Date().toISOString(),
        commercial: commercialSelect.value,
        status: statusSelect.value,
        decidento_contact_id: decidentoContactId,
        notes: notesInput.value.trim(),
        rdv_date: rdvDateInput.value || '',
        send_confirmation_email: sendConfirmation,
        send_offer_email: sendOfferEmail,
        send_appel_sans_reponse: sendAppelSansReponse,
        email_template: emailTemplate,
        offer_brochure: selectedBrochure,
        rappel_date: statusSelect.value === 'Pas de besoin immédiat - rappel' ? computeRappelDate() : '',
        rappel_delai: statusSelect.value === 'Pas de besoin immédiat - rappel' ? rappelDelaiSelect.value : '',
        contact: {
          name: currentName || contactData.name || '',
          firstname: currentFirstname || contactData.firstname || '',
          lastname: currentLastname || contactData.lastname || '',
          position: positionInput.value.trim() || contactData.position || '',
          address: contactData.address || '',
          title_tag: contactData.title_tag || '',
          linkedin_url: contactData.linkedin_url || '',
          email: emailInput.value.trim() || contactData.email || '',
          phone: phoneInput.value.trim() || ''
        },
        company: {
          name: companyData.name || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          website: companyData.website || '',
          siren: companyData.siren || '',
          siret: companyData.siret || '',
          type_entreprise: companyData.type_entreprise || '',
          effectif: companyData.effectif || '',
          chiffre_affaires: companyData.chiffre_affaires || '',
          capital_social: companyData.capital_social || '',
          forme_juridique: companyData.forme_juridique || '',
          numero_tva: companyData.numero_tva || '',
          date_creation: companyData.date_creation || '',
          convention_collective: companyData.convention_collective || ''
        },
        source_url: window.location.href
      };

      try {
        const { webhookUrl } = await chrome.storage.local.get(['webhookUrl']);
        const url = webhookUrl || WEBHOOK_DEFAULT;

        const result = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'sendWebhook', url, payload },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            }
          );
        });

        if (result.success) {
          feedbackDiv.className = 'formaxe-feedback formaxe-success';
          feedbackDiv.textContent = `Envoyé avec succès ! (${currentName || contactData.name})`;
          setTimeout(() => {
            form.classList.remove('formaxe-visible');
            document.querySelectorAll('.formaxe-highlight').forEach(el => el.classList.remove('formaxe-highlight'));
            feedbackDiv.className = 'formaxe-feedback';
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg> Envoyer';
          }, 2000);
        } else {
          throw new Error(result.error || 'Erreur inconnue');
        }
      } catch (err) {
        feedbackDiv.className = 'formaxe-feedback formaxe-error';
        feedbackDiv.textContent = `Erreur d'envoi : ${err.message}`;
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg> Envoyer';
      }
    });

    return form;
  }

  // ── Inject buttons into all contact blocs ──
  function injectButtons() {
    const contactBlocs = document.querySelectorAll('.contact-bloc');
    if (contactBlocs.length === 0) return;

    const companyData = extractCompanyData();
    let checkDelay = 0;
    const DELAY_BETWEEN_CHECKS = 350; // ms between each HubSpot check to avoid rate limits

    contactBlocs.forEach((bloc) => {
      // Skip if already injected
      if (bloc.querySelector('.formaxe-btn-container')) return;

      // Create button container
      const btnContainer = document.createElement('div');
      btnContainer.className = 'formaxe-btn-container';

      const btn = document.createElement('button');
      btn.className = 'formaxe-extract-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        Envoyer sur HubSpot
      `;

      btnContainer.appendChild(btn);

      // Create the mini-form (hidden by default)
      const contactData = extractContactData(bloc);
      const miniForm = createMiniForm(contactData, companyData);

      // ── Check if contact already exists in HubSpot (staggered to avoid rate limits) ──
      const decidentoContactId = generateContactId(companyData.siren, contactData.name);
      const currentDelay = checkDelay;
      checkDelay += DELAY_BETWEEN_CHECKS;
      setTimeout(() => {
        checkContactInHubSpot(decidentoContactId).then((statusData) => {
          injectStatusBadge(bloc, statusData);
        });
      }, currentDelay);

      // Insert after the contact bloc
      bloc.insertAdjacentElement('afterend', miniForm);
      bloc.insertAdjacentElement('afterend', btnContainer);

      // Toggle form on click
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close other open forms and remove highlights
        document.querySelectorAll('.formaxe-form-container.formaxe-visible').forEach(f => {
          if (f !== miniForm) {
            f.classList.remove('formaxe-visible');
          }
        });
        document.querySelectorAll('.formaxe-highlight').forEach(el => {
          if (el !== bloc) el.classList.remove('formaxe-highlight');
        });

        miniForm.classList.toggle('formaxe-visible');
        bloc.classList.toggle('formaxe-highlight');
      });
    });
  }

  // ── Observe DOM changes (SPA navigation) ──
  function observeChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldInject = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (node.classList?.contains('contact-bloc') || node.querySelector?.('.contact-bloc')) {
                shouldInject = true;
                break;
              }
            }
          }
        }
        if (shouldInject) break;
      }
      if (shouldInject) {
        setTimeout(injectButtons, 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Initialize ──
  async function init() {
    console.log(`[Formaxe - Acquisition] v${VERSION} loaded on ${window.location.href}`);

    // Load owners list from HubSpot before injecting buttons
    await loadOwners();

    // Initial injection
    setTimeout(injectButtons, 1000);

    // Watch for dynamic content
    observeChanges();

    // Also re-inject on hash changes (SPA)
    window.addEventListener('hashchange', () => {
      setTimeout(injectButtons, 1000);
    });
  }

  // ── Message listener for popup communication ──
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getContactsCount') {
      const count = document.querySelectorAll('.contact-bloc').length;
      sendResponse({ count });
    }
    return true;
  });

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
