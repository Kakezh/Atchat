// Atchat background service worker
// Initializes storage on extension install.

chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage if needed
  chrome.storage.local.get(['atchat_snippets'], (result) => {
    if (!result.atchat_snippets) {
      chrome.storage.local.set({ atchat_snippets: [] });
    }
  });
});
