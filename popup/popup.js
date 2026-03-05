/**
 * Formaxe - Acquisition | Popup Script
 * Version: 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statsSection = document.getElementById('stats-section');
  const contactsCount = document.getElementById('contacts-count');
  const optionsBtn = document.getElementById('options-btn');

  // Check if current tab is on Decidento
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes('platform.decidento.com')) {
      statusDot.classList.add('active');
      statusText.textContent = 'Actif sur Decidento';
      statsSection.style.display = 'flex';

      // Get contacts count from the page
      chrome.tabs.sendMessage(tab.id, { action: 'getContactsCount' }, (response) => {
        if (chrome.runtime.lastError) {
          contactsCount.textContent = '—';
          return;
        }
        if (response && response.count !== undefined) {
          contactsCount.textContent = response.count;
        }
      });
    } else {
      statusDot.classList.add('inactive');
      statusText.textContent = 'Inactif — Naviguez sur Decidento';
    }
  });

  // Options button
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
