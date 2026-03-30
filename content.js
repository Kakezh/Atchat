/**
 * Atchat content script
 *
 * Adds two features to AI chat pages:
 *   1. Select text → click "📌 Save to @" to store it as a snippet.
 *   2. Type "@" inside any chat input to open a snippet picker.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'atchat_snippets';

  // ─────────────────────────────────────────────
  // Storage helpers
  // ─────────────────────────────────────────────

  function getSnippets() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || []);
      });
    });
  }

  function saveSnippet(text) {
    return getSnippets().then((snippets) => {
      const snippet = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: text.trim(),
        label: text.trim().length > 60
          ? text.trim().slice(0, 60) + '…'
          : text.trim(),
        savedAt: new Date().toISOString(),
        source: window.location.hostname,
      };
      snippets.unshift(snippet);
      if (snippets.length > 100) snippets.splice(100);
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY]: snippets }, () => resolve(snippet));
      });
    });
  }

  // ─────────────────────────────────────────────
  // "Save to @" floating button
  // ─────────────────────────────────────────────

  let $saveBtn = null;
  let pendingText = '';

  function ensureSaveBtn() {
    if ($saveBtn && document.body.contains($saveBtn)) return $saveBtn;
    $saveBtn = document.createElement('button');
    $saveBtn.id = 'atchat-save-btn';
    $saveBtn.type = 'button';
    $saveBtn.setAttribute('aria-label', 'Save selected text as an @ snippet');
    $saveBtn.innerHTML =
      '<span class="atchat-save-icon">📌</span> Save to @';
    document.body.appendChild($saveBtn);

    $saveBtn.addEventListener('mousedown', (e) => e.preventDefault());
    $saveBtn.addEventListener('click', () => {
      if (!pendingText) return;
      saveSnippet(pendingText).then(() => {
        hideSaveBtn();
        showToast('Snippet saved! Type @ in chat to use it.');
        window.getSelection()?.removeAllRanges();
        pendingText = '';
      });
    });
    return $saveBtn;
  }

  function showSaveBtn(text, rect) {
    pendingText = text;
    const btn = ensureSaveBtn();
    const x = rect.left + window.scrollX + rect.width / 2 - 68;
    const y = rect.bottom + window.scrollY + 8;
    btn.style.left = `${Math.max(4, x)}px`;
    btn.style.top = `${y}px`;
    btn.classList.add('visible');
  }

  function hideSaveBtn() {
    $saveBtn?.classList.remove('visible');
    pendingText = '';
  }

  document.addEventListener('mouseup', (e) => {
    if (e.target.closest('#atchat-save-btn') || e.target.closest('#atchat-dropdown')) return;

    // Small delay so the selection is finalised
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (text.length >= 10) {
        const range = sel.getRangeAt(0);
        showSaveBtn(text, range.getBoundingClientRect());
      } else {
        hideSaveBtn();
      }
    }, 20);
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#atchat-save-btn')) hideSaveBtn();
  });

  // ─────────────────────────────────────────────
  // Toast notification
  // ─────────────────────────────────────────────

  let $toast = null;
  let toastTimer = null;

  function showToast(message) {
    if (!$toast || !document.body.contains($toast)) {
      $toast = document.createElement('div');
      $toast.id = 'atchat-toast';
      $toast.setAttribute('role', 'status');
      $toast.setAttribute('aria-live', 'polite');
      document.body.appendChild($toast);
    }
    $toast.textContent = message;
    $toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('visible'), 2500);
  }

  // ─────────────────────────────────────────────
  // @ Snippet picker dropdown
  // ─────────────────────────────────────────────

  let $dropdown = null;
  let activeInput = null;
  let highlightedIndex = -1;

  function ensureDropdown() {
    if ($dropdown && document.body.contains($dropdown)) return $dropdown;
    $dropdown = document.createElement('div');
    $dropdown.id = 'atchat-dropdown';
    $dropdown.setAttribute('role', 'listbox');
    $dropdown.setAttribute('aria-label', 'Snippet suggestions');
    document.body.appendChild($dropdown);
    return $dropdown;
  }

  function renderDropdown(inputEl, snippets) {
    const dd = ensureDropdown();
    dd.innerHTML = '';
    highlightedIndex = -1;

    snippets.forEach((snippet, i) => {
      const item = document.createElement('div');
      item.className = 'atchat-item';
      item.setAttribute('role', 'option');
      item.dataset.index = i;
      item.dataset.id = snippet.id;

      const label = document.createElement('div');
      label.className = 'atchat-item-label';
      label.textContent = snippet.label;

      const preview = document.createElement('div');
      preview.className = 'atchat-item-preview';
      preview.textContent = snippet.text.length > 120
        ? snippet.text.slice(0, 120) + '…'
        : snippet.text;

      item.appendChild(label);
      item.appendChild(preview);

      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep input focused
        commitSnippet(inputEl, snippet.text);
        hideDropdown();
      });
      dd.appendChild(item);
    });

    positionDropdown(inputEl, dd);
    dd.style.display = 'block';
    activeInput = inputEl;
  }

  function positionDropdown(inputEl, dd) {
    const rect = inputEl.getBoundingClientRect();
    dd.style.left = `${rect.left + window.scrollX}px`;
    dd.style.minWidth = `${Math.max(rect.width, 320)}px`;
    dd.style.maxWidth = `${Math.min(window.innerWidth - rect.left - 16, 560)}px`;

    // Temporarily make it visible but off-screen to measure height
    dd.style.top = '-9999px';
    dd.style.display = 'block';

    requestAnimationFrame(() => {
      const ddH = dd.offsetHeight;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceAbove >= ddH + 8 || spaceAbove > spaceBelow) {
        dd.style.top = `${rect.top + window.scrollY - ddH - 8}px`;
      } else {
        dd.style.top = `${rect.bottom + window.scrollY + 8}px`;
      }
    });
  }

  function hideDropdown() {
    if ($dropdown) $dropdown.style.display = 'none';
    highlightedIndex = -1;
    activeInput = null;
  }

  function setHighlight(index) {
    const items = $dropdown?.querySelectorAll('.atchat-item');
    if (!items || items.length === 0) return;
    items.forEach((el) => el.classList.remove('atchat-item--active'));
    highlightedIndex = Math.max(0, Math.min(index, items.length - 1));
    items[highlightedIndex].classList.add('atchat-item--active');
    items[highlightedIndex].scrollIntoView({ block: 'nearest' });
  }

  // ─────────────────────────────────────────────
  // Get @ query from the current cursor position
  // ─────────────────────────────────────────────

  /**
   * Returns { atIdx, query } where atIdx is the index of @ in the text
   * before the cursor, and query is the text typed after @.
   * Returns null if no active @ mention is found.
   */
  function getAtQuery(inputEl) {
    let textBeforeCursor;

    if (inputEl.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
      const range = sel.getRangeAt(0);
      const pre = document.createRange();
      try {
        pre.selectNodeContents(inputEl);
        pre.setEnd(range.startContainer, range.startOffset);
      } catch (_) {
        return null;
      }
      textBeforeCursor = pre.toString();
    } else {
      // textarea / input
      textBeforeCursor = inputEl.value.slice(0, inputEl.selectionStart ?? inputEl.value.length);
    }

    const atIdx = textBeforeCursor.lastIndexOf('@');
    if (atIdx === -1) return null;

    const query = textBeforeCursor.slice(atIdx + 1);
    // Cancel if there's whitespace after @  (user moved past this mention)
    if (/[\s\n]/.test(query)) return null;

    return { atIdx, query, textBeforeCursor };
  }

  // ─────────────────────────────────────────────
  // Insert a snippet into the chat input
  // ─────────────────────────────────────────────

  function commitSnippet(inputEl, snippetText) {
    const mentionText = (snippetText || '').trim();
    if (!mentionText) return;

    if (inputEl.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;

      const range = sel.getRangeAt(0);
      const pre = document.createRange();
      try {
        pre.selectNodeContents(inputEl);
        pre.setEnd(range.startContainer, range.startOffset);
      } catch (_) {
        return;
      }
      const textBeforeCursor = pre.toString();
      const atIdx = textBeforeCursor.lastIndexOf('@');
      if (atIdx === -1) return;

      // How many characters to select backwards (the @query part)
      const backCount = textBeforeCursor.length - atIdx;

      // Extend selection backwards to cover @query
      for (let i = 0; i < backCount; i++) {
        sel.modify('extend', 'backward', 'character');
      }

      // Replace with snippet (execCommand keeps React's synthetic events happy)
      document.execCommand('insertText', false, mentionText + ' ');
    } else {
      const pos = inputEl.selectionStart ?? inputEl.value.length;
      const value = inputEl.value;
      const atIdx = value.slice(0, pos).lastIndexOf('@');
      if (atIdx === -1) return;

      const newValue = value.slice(0, atIdx) + mentionText + ' ' + value.slice(pos);

      // Use the native property setter so React / Vue notice the change
      const proto = Object.getPrototypeOf(inputEl);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        desc.set.call(inputEl, newValue);
      } else {
        inputEl.value = newValue;
      }

      const newCursor = atIdx + mentionText.length + 1;
      inputEl.selectionStart = inputEl.selectionEnd = newCursor;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }

  // ─────────────────────────────────────────────
  // Determine whether an element is a chat input
  // ─────────────────────────────────────────────

  function isChatInput(el) {
    if (!el || el === document.body) return false;
    if (el.closest('#atchat-dropdown') || el.closest('#atchat-save-btn')) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  // ─────────────────────────────────────────────
  // Input event → show/hide dropdown
  // ─────────────────────────────────────────────

  document.addEventListener(
    'input',
    (e) => {
      const target = e.target;
      if (!isChatInput(target)) return;

      const info = getAtQuery(target);
      if (!info) {
        hideDropdown();
        return;
      }

      getSnippets().then((snippets) => {
        if (!snippets.length) {
          hideDropdown();
          return;
        }

        const q = info.query.toLowerCase();
        const filtered = q
          ? snippets.filter(
              (s) =>
                s.label.toLowerCase().includes(q) ||
                s.text.toLowerCase().includes(q)
            )
          : snippets;

        const visible = filtered.slice(0, 8);
        if (!visible.length) {
          hideDropdown();
          return;
        }

        renderDropdown(target, visible);
      });
    },
    true
  );

  // ─────────────────────────────────────────────
  // Keyboard navigation inside the dropdown
  // ─────────────────────────────────────────────

  document.addEventListener(
    'keydown',
    (e) => {
      if (!$dropdown || $dropdown.style.display === 'none') return;

      const items = $dropdown.querySelectorAll('.atchat-item');
      const count = items.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setHighlight(highlightedIndex < 0 ? 0 : highlightedIndex + 1);
          break;

        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setHighlight(highlightedIndex <= 0 ? 0 : highlightedIndex - 1);
          break;

        case 'Enter':
        case 'Tab':
          if (highlightedIndex >= 0 && highlightedIndex < count) {
            e.preventDefault();
            e.stopPropagation();
            const id = items[highlightedIndex].dataset.id;
            getSnippets().then((snippets) => {
              const s = snippets.find((x) => x.id === id);
              if (s && activeInput) {
                commitSnippet(activeInput, s.text);
                hideDropdown();
              }
            });
          }
          break;

        case 'Escape':
          e.preventDefault();
          hideDropdown();
          break;

        default:
          break;
      }
    },
    true
  );

  // Hide when clicking outside
  document.addEventListener(
    'click',
    (e) => {
      if (!e.target.closest('#atchat-dropdown') && !e.target.closest('#atchat-save-btn')) {
        hideDropdown();
      }
    },
    true
  );

  // Hide on blur (with small delay to allow dropdown click to fire first)
  document.addEventListener(
    'blur',
    (e) => {
      if (!activeInput || e.target !== activeInput) return;
      setTimeout(() => {
        if (!document.activeElement?.closest('#atchat-dropdown')) {
          hideDropdown();
        }
      }, 150);
    },
    true
  );
})();
