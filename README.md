# Markdown Editor

A single-file, browser-based markdown editor with live preview and macOS Finder integration.

## Features

- **Live preview** — rendered HTML updates as you type
- **Multiple tabs** — open several files at once, drag to reorder
- **Syntax highlighting** via CodeMirror 5 (markdown mode)
- **Formatting toolbar** — bold, italic, headings, lists, blockquote, code, links, images
- **Table of contents** sidebar, auto-generated from headings
- **KaTeX** math rendering (inline `$...$` and display `$$...$$`)
- **Mermaid** diagrams (fenced code blocks with `mermaid`)
- **Dark/light theme** toggle, persisted across sessions
- **Auto-save** to `localStorage` (2-second debounce, per-tab)
- **Drag-and-drop** images (base64 embedded)
- **Paste images** from clipboard
- **Export** rendered preview to a standalone HTML file
- **Focus mode** — hides the toolbar and preview for distraction-free writing
- **Present mode** — slide deck from `---`-separated sections
- **Find and replace** (Ctrl+F)
- **Vim / Emacs** key bindings (optional)
- **Print stylesheet** — prints the preview only
- **Resizable split pane**
- No build step and nothing to install locally: the app is one HTML file. Its libraries (CodeMirror, marked, KaTeX, Mermaid, and DOMPurify for sanitizing rendered HTML) load from the jsDelivr CDN over HTTPS with pinned versions and Subresource Integrity, so an internet connection is required on first load.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+O | Open file |
| Ctrl+S | Save file |
| Ctrl+Shift+S | Save As |
| Ctrl+W | Close tab |
| Ctrl+Tab | Next tab |
| Ctrl+B / I / K | Bold / Italic / Link |
| Ctrl+F | Find and replace |

## Usage

### In the browser

Open `index.html` directly in any modern browser. No server required.

### macOS — double-click `.md` files in Finder

First build `Markdown Editor.app` (one-time):

```bash
./bin/setup-macos-app.sh
```

This creates `Markdown Editor.app` in the repo root. The app is self-contained and can be moved to `/Applications`. To set it as the default handler for `.md` files:

1. Right-click any `.md` file in Finder and choose **Open With > Other...**
2. Select `Markdown Editor.app`
3. To make it the default: **Get Info > Open With > Markdown Editor > Change All...**

Double-clicking subsequent `.md` files opens them as tabs in the same editor window.

#### Terminal

```bash
./bin/md-open.sh path/to/file.md
```

#### Distribution zip

```bash
./bin/make-zip.sh   # produces Markdown Editor.zip
```

The zip is a build artifact (not committed to the repo); attach it to a [GitHub Release](https://github.com/pisanuw/markdown-viewer-editor/releases) for distribution.

## How the macOS integration works

`Markdown Editor.app` is an AppleScript droplet compiled with `osacompile`. When a `.md` file is double-clicked:

1. macOS sends an `on open` Apple Event to the droplet
2. The droplet calls `md-open-helper.sh` in the background
3. The helper base64-encodes the file, injects it into a temp HTML page, and opens it in the default browser
4. If an editor tab is already open it receives the file as a new tab via `localStorage` IPC; otherwise the temp page initialises as a full editor
5. The temp file is cleaned up after 30 seconds

## Repository

https://github.com/pisanuw/markdown-viewer-editor
