/**
 * Formaxe - Acquisition | Options Script
 * Version: 1.0.0
 */

const DEFAULT_WEBHOOK = 'https://getgarsen.app.n8n.cloud/webhook-test/decidento';

document.addEventListener('DOMContentLoaded', () => {
  const webhookInput = document.getElementById('webhook-url');
  const saveBtn = document.getElementById('save-btn');
  const feedback = document.getElementById('feedback');

  // Load saved settings
  chrome.storage.local.get(['webhookUrl'], (result) => {
    webhookInput.value = result.webhookUrl || DEFAULT_WEBHOOK;
  });

  // Save
  saveBtn.addEventListener('click', () => {
    const url = webhookInput.value.trim();

    if (!url) {
      feedback.className = 'feedback error';
      feedback.textContent = 'Veuillez entrer une URL valide.';
      return;
    }

    chrome.storage.local.set({ webhookUrl: url }, () => {
      feedback.className = 'feedback success';
      feedback.textContent = 'Configuration sauvegardée !';
      setTimeout(() => {
        feedback.style.display = 'none';
        feedback.className = 'feedback';
      }, 3000);
    });
  });
});
