# Markdown Editor

A simple split-pane markdown editor with live preview.

## Scope

- Single-file HTML app (no build tools)
- Left pane: markdown source editor
- Right pane: rendered HTML preview
- Word count, download, word wrap toggle

## Technical decisions

- Uses [marked.js](https://marked.js.org/) from CDN for markdown rendering
- Vanilla JS, no framework
- Responsive layout (stacks vertically on mobile)
- File System Access API for open/save with fallback to `<input type="file">` and download
- Tracks dirty state (unsaved changes indicator)

## Features

- Syntax highlighting via CodeMirror 5 (markdown mode)
- Resizable split pane (draggable divider)
- Line numbers and active line highlight
- Formatting toolbar (bold, italic, headings, lists, blockquote, code, links, images)
- Dark/light theme toggle persisted to localStorage
- Export rendered preview to standalone HTML
- Print stylesheet (hides chrome, shows preview only)
- Table of contents sidebar auto-generated from headings
- Scroll sync (preview scrolls to match editor cursor)
- Auto-save to localStorage (2s debounce, per-tab)
- Drag-and-drop images (base64 embed)
- Clipboard paste for images
- Find and replace (Ctrl+F) via CodeMirror search addon
- Recent files list (persisted to localStorage)
- Multiple file tabs with dirty indicators
- Focus mode (distraction-free, hides preview/format bar)
- Smart newline continuation for lists and blockquotes
- Keyboard shortcuts: Ctrl+B/I/K (format), Ctrl+O/S (open/save), Ctrl+W (close tab), Ctrl+Tab (switch tab)

## Non-goals

- File management / folder tree
- Collaborative editing
- WYSIWYG editing (markdown source only)

## macOS Integration

Double-click a `.md` file in Finder to open it in the editor:

```bash
# Option 1: One-time setup creates a native .app
./bin/setup-macos-app.sh

# Then right-click any .md file -> Open With -> Markdown Editor
# (set as default via Get Info -> Change All)
```

Running `./bin/setup-macos-app.sh` creates `Markdown Editor.app` with `index.html` bundled inside `Contents/Resources/`. The app is fully self-contained -- you can move it to `/Applications` with no external dependencies.

The app registers itself for `.md` files via LaunchServices. Mechanism:

1. Double-clicking a `.md` file triggers `Contents/MacOS/md-open`
2. It base64-encodes the file content, creates a temp HTML with the content injected, and opens it in the default browser
3. Temp file is cleaned up after 30 seconds

A standalone shell script (`bin/md-open.sh <file>`) is also available for terminal use.
