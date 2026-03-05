/**
 * Formaxe - Acquisition | Background Service Worker
 * Version: 1.0.0
 * Developed by Gripow
 *
 * Handles webhook POST requests and contact check GET requests
 * to bypass CORS restrictions.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ── Send data to n8n webhook (POST) ──
  if (request.action === 'sendWebhook') {
    const { url, payload } = request;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        if (response.ok) {
          const text = await response.text();
          sendResponse({ success: true, status: response.status, body: text });
        } else {
          sendResponse({ success: false, error: `HTTP ${response.status}` });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  // ── Check if contact exists in HubSpot via n8n check webhook (POST) ──
  if (request.action === 'checkContact') {
    const { url, decidentoContactId } = request;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decidento_contact_id: decidentoContactId })
    })
      .then(async (response) => {
        if (response.ok) {
          const text = await response.text();
          sendResponse({ success: true, status: response.status, body: text });
        } else {
          sendResponse({ success: false, error: `HTTP ${response.status}` });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }
});
