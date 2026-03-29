/**
 * Atchat popup script
 * Manages the list of saved @ snippets.
 */

const STORAGE_KEY = 'atchat_snippets';

let allSnippets = [];

// ─────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────

function loadSnippets() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

function persistSnippets(snippets) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: snippets }, resolve);
  });
}

// ─────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────

function renderList(snippets) {
  const list = document.getElementById('list');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');
  const clearBtn = document.getElementById('clear-all');

  list.innerHTML = '';

  if (snippets.length === 0) {
    empty.removeAttribute('hidden');
    count.textContent = '';
    clearBtn.hidden = true;
    return;
  }

  empty.setAttribute('hidden', '');
  count.textContent = `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}`;
  clearBtn.hidden = false;

  snippets.forEach((snippet) => {
    const card = document.createElement('div');
    card.className = 'snippet-card';
    card.setAttribute('role', 'listitem');
    card.dataset.id = snippet.id;

    const body = document.createElement('div');
    body.className = 'snippet-body';

    const labelEl = document.createElement('div');
    labelEl.className = 'snippet-label';
    labelEl.textContent = snippet.label || snippet.text.slice(0, 60);

    const textEl = document.createElement('div');
    textEl.className = 'snippet-text';
    textEl.textContent = snippet.text.length > 100
      ? snippet.text.slice(0, 100) + '…'
      : snippet.text;

    const meta = document.createElement('div');
    meta.className = 'snippet-meta';
    const date = new Date(snippet.savedAt);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    meta.textContent = `${snippet.source || 'unknown'} · ${dateStr}`;

    body.appendChild(labelEl);
    body.appendChild(textEl);
    body.appendChild(meta);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'snippet-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-icon copy';
    copyBtn.title = 'Copy to clipboard';
    copyBtn.textContent = '📋';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(snippet.text).then(() => {
        copyBtn.textContent = '✅';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = '📋';
          copyBtn.classList.remove('copied');
        }, 1500);
      });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon delete';
    deleteBtn.title = 'Delete snippet';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => {
      allSnippets = allSnippets.filter((s) => s.id !== snippet.id);
      persistSnippets(allSnippets).then(() => {
        const query = document.getElementById('search').value.trim().toLowerCase();
        renderList(query ? allSnippets.filter((s) => matches(s, query)) : allSnippets);
      });
    });

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(body);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

function matches(snippet, query) {
  return (
    snippet.label.toLowerCase().includes(query) ||
    snippet.text.toLowerCase().includes(query) ||
    (snippet.source || '').toLowerCase().includes(query)
  );
}

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Load and render
  loadSnippets().then((snippets) => {
    allSnippets = snippets;
    renderList(allSnippets);
  });

  // Live search
  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderList(q ? allSnippets.filter((s) => matches(s, q)) : allSnippets);
  });

  // Clear all
  document.getElementById('clear-all').addEventListener('click', () => {
    if (!confirm('Delete all saved snippets?')) return;
    allSnippets = [];
    persistSnippets([]).then(() => renderList([]));
  });

  // Refresh list when storage changes (e.g., snippet added from content script)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
      allSnippets = changes[STORAGE_KEY].newValue || [];
      const q = document.getElementById('search').value.trim().toLowerCase();
      renderList(q ? allSnippets.filter((s) => matches(s, q)) : allSnippets);
    }
  });
});
