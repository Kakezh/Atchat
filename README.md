# Atchat

A browser extension that brings **@ snippet referencing** to AI chat websites (ChatGPT, Gemini, Claude, Perplexity, Poe).

When important fragments surface in a conversation, save them with one click and paste them back into any chat input by typing `@`.

---

## Features

| Feature | Description |
|---------|-------------|
| 📌 Save to @ | Select any text on a chat page → click the floating **"📌 Save to @"** button |
| @ Picker | Type `@` in the chat input to open an inline snippet picker |
| Fuzzy search | Filter snippets by label or content while typing after `@` |
| Keyboard nav | Arrow keys + Enter/Tab to select a snippet; Escape to dismiss |
| Popup manager | Click the extension icon to view, search, copy or delete snippets |
| Dark mode | Automatically adapts to the page's color scheme |

---

## Supported Sites

- **ChatGPT** – `chatgpt.com`, `chat.openai.com`
- **Gemini** – `gemini.google.com`
- **Claude** – `claude.ai`
- **Perplexity** – `perplexity.ai`
- **Poe** – `poe.com`

---

## Installation (Developer Mode)

1. Clone or download this repository.
2. Open **Chrome** → `chrome://extensions/` (or **Edge** → `edge://extensions/`).
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **"Load unpacked"** and select the root folder of this repository.
5. Navigate to a supported chat page – the extension is ready!

---

## How to Use

### Saving a snippet

1. On any supported chat page, select text you want to save (at least 10 characters).
2. A blue **"📌 Save to @"** button appears near your selection.
3. Click the button – the snippet is saved to extension storage.

### Using a snippet

1. Click in the chat input box.
2. Type `@` followed optionally by a search term (e.g. `@python`).
3. A dropdown appears showing matching snippets.
4. Navigate with **↑ ↓** keys, press **Enter** or **Tab** to insert, or click with the mouse.
5. The snippet is inserted at the `@` position.

### Managing snippets

Click the **Atchat icon** in the browser toolbar to open the popup:
- **Search** snippets by label or content.
- **📋 Copy** a snippet to the clipboard.
- **🗑 Delete** individual snippets.
- **Clear all** to wipe everything.

---

## Project Structure

```
manifest.json    – Chrome Extension Manifest V3
background.js    – Service worker (storage initialisation)
content.js       – Content script: save-button + @ picker + insertion logic
content.css      – Styles for the save button, dropdown and toast
popup.html       – Extension popup page
popup.js         – Popup logic (list / search / copy / delete)
popup.css        – Popup styles
icons/           – Extension icons (16 × 16, 48 × 48, 128 × 128 PNG)
```

---

## License

MIT
