/**
 * Formaxe - Acquisition | Content Script
 * Version: 1.0.0
 * Developed by Gripow
 *
 * Injects extraction buttons under each contact block on Decidento platform.
 */

(function () {
  'use strict';

  const VERSION = '1.0.0';
  const WEBHOOK_DEFAULT = 'https://getgarsen.app.n8n.cloud/webhook/decidento';

  const STATUS_OPTIONS = [
    'Message vocal laissé',
    'Email envoyé',
    'Injoignable',
    'Rendez-vous pris',
    'Ne plus rappeler',
    'Déjà appelé',
    'Pas intéressé',
    'Déjà en partenariat',
    'A raccroché'
  ];

  const COMMERCIAUX = [
    'Baptiste Cordier',
    'Louis Prezeau'
  ];

  const CHECK_WEBHOOK_PATH = 'formaxe-check';

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
      // Mapper les valeurs enum vers des noms lisibles
      const commercialLabels = {
        'baptiste_cordier': 'Baptiste',
        'louis_prezeau': 'Louis'
      };
      const commercialName = commercialLabels[statusData.commercial] || statusData.commercial || '';
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
      // Get only the text node content, not nested buttons
      const nameText = nameParagraph.childNodes[0]?.textContent?.trim();
      data.name = nameText || '';
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

    // Email
    const contactInfoSection = contactBloc.querySelector('.contact-info');
    if (contactInfoSection) {
      // Look for email link
      const emailLink = contactInfoSection.querySelector('a[href^="mailto:"]');
      if (emailLink && !emailLink.classList.contains('disabled-link')) {
        data.email = emailLink.getAttribute('href')?.replace('mailto:', '') || '';
      } else {
        // Check for detected email text
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

    form.innerHTML = `
      <div class="formaxe-form-header">
        <img src="${getLogoURL()}" alt="Formaxe" class="formaxe-form-logo">
        <span class="formaxe-form-title">Formaxe - Acquisition</span>
      </div>
      <div class="formaxe-form-contact-summary">
        <strong>${contactData.name || 'N/A'}</strong> — ${contactData.position || 'N/A'}
        ${companyData.name ? ' | ' + companyData.name : ''}
        ${companyData.siren ? ' <span class="formaxe-siren-badge">SIREN ' + companyData.siren + '</span>' : ''}
      </div>
      <div class="formaxe-form-row">
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

    // Load saved webhook URL
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

    // Enable send button only when both dropdowns are selected
    const statusSelect = form.querySelector('.formaxe-select-status');
    const commercialSelect = form.querySelector('.formaxe-select-commercial');
    const sendBtn = form.querySelector('.formaxe-send-btn');
    const feedbackDiv = form.querySelector('.formaxe-feedback');

    function checkSelections() {
      sendBtn.disabled = !(statusSelect.value && commercialSelect.value);
    }

    statusSelect.addEventListener('change', checkSelections);
    commercialSelect.addEventListener('change', checkSelections);

    // Remember last commercial selection
    chrome.storage.local.get(['lastCommercial'], (result) => {
      if (result.lastCommercial) {
        commercialSelect.value = result.lastCommercial;
        checkSelections();
      }
    });

    // Send button click
    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Envoi...';

      // Save commercial preference
      chrome.storage.local.set({ lastCommercial: commercialSelect.value });

      const decidentoContactId = generateContactId(companyData.siren, contactData.name);

      const payload = {
        timestamp: new Date().toISOString(),
        commercial: commercialSelect.value,
        status: statusSelect.value,
        decidento_contact_id: decidentoContactId,
        contact: {
          name: contactData.name || '',
          position: contactData.position || '',
          address: contactData.address || '',
          title_tag: contactData.title_tag || '',
          linkedin_url: contactData.linkedin_url || '',
          email: contactData.email || ''
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
        // Get webhook URL from storage or use default
        const { webhookUrl } = await chrome.storage.local.get(['webhookUrl']);
        const url = webhookUrl || WEBHOOK_DEFAULT;

        // Send via background service worker to avoid CORS issues
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
          feedbackDiv.textContent = `Envoyé avec succès ! (${contactData.name})`;
          // Auto-hide form after 2s
          setTimeout(() => {
            form.classList.remove('formaxe-visible');
            // Remove highlight from parent contact bloc
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
  function init() {
    console.log(`[Formaxe - Acquisition] v${VERSION} loaded on ${window.location.href}`);

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
