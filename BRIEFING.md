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
- Routing Finder-opened files into a single browser tab (browser limitation; each double-click opens a new tab by design)

## macOS Integration

Double-click a `.md` file in Finder to open it in the editor:

```bash
# Build the app (one-time setup)
./bin/setup-macos-app.sh

# Then right-click any .md file -> Open With -> Markdown Editor
# (set as default via Get Info -> Change All)
```

Running `./bin/setup-macos-app.sh` creates `Markdown Editor.app` with `index.html` bundled inside `Contents/Resources/`. The app is fully self-contained and can be moved to `/Applications`.

The app registers itself for `.md` files via LaunchServices. Mechanism:

1. Double-clicking a `.md` file sends an Apple Event (`on open`) to `Contents/MacOS/droplet`
2. `droplet` is the AppleScript runtime binary produced by `osacompile`; it loads `Contents/Resources/Scripts/main.scpt` and runs the `on open` handler, which calls `Contents/Resources/md-open-helper.sh` in the background
3. The helper base64-encodes the file, injects the content (raw base64 into `window.__initialContent`) into a temp HTML, and opens it in the default browser; each double-click opens a new browser tab
4. Temp file is cleaned up after 30 seconds

**Important constraints:**
- `CFBundleExecutable` must be `droplet` (the name osacompile assigns). Renaming it breaks Apple Event delivery.
- The full bundle from `osacompile` must be preserved: `PkgInfo`, `droplet.rsrc`, `Assets.car`, and `OSAAppletShowStartupScreen=false` in the plist are all required. Extracting only the binary into a hand-crafted bundle omits these and causes the "Press Run" dialog.
- `setup-macos-app.sh` compiles directly to the final app path, patches the plist with PlistBuddy, then re-signs with `codesign --force --deep --sign -`.
- `do shell script` must redirect helper output to `/dev/null` (`> /dev/null 2>&1 &`); without this the droplet blocks on I/O and becomes unresponsive.
- Do NOT add `tell me to quit` to the `on open` handler — it causes the droplet to hang.

A standalone shell script (`bin/md-open.sh <file>`) is available for terminal use.

To rebuild the zip for distribution: `./bin/make-zip.sh`

## Repository

https://github.com/pisanuw/markdown-viewer-editor
