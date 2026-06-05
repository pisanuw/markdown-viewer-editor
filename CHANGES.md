2026-05-24 doc Created BRIEFING.md with scope, decisions, non-goals
2026-05-24 code Created index.html: split-pane markdown editor with live preview
2026-05-24 code index.html: added file open/save via File System Access API with fallback; keyboard shortcuts Ctrl+O/S; dirty state indicator
2026-05-24 code index.html: implemented all features - CodeMirror syntax highlighting, resizable splitter, formatting toolbar, dark/light theme, HTML export, print styles, TOC sidebar, scroll sync, auto-save, drag-drop images, find/replace, recent files, file tabs, focus mode
2026-05-24 code Created bin/md-open.sh and bin/setup-macos-app.sh for macOS file association
2026-05-24 fix Fixed macOS scripts: DIR path depth, temp file .html extension, base64 encoding for UTF-8 safety, removed fragile heredoc quoting
2026-05-24 code Bundled index.html inside .app/Contents/Resources/ for self-contained deployment to /Applications
2026-05-24 code Implemented 19 features: KaTeX math, Mermaid diagrams, anchor links, task list toggling, Vim/Emacs keymaps, font size slider, emoji picker, fullscreen, shortcut cheat sheet, spell check, open recent dropdown, workspace save/restore, auto backups, copy HTML, PDF print, present mode, drag tabs, word stats breakdown, preview-only mode
2026-05-24 fix Protected mermaid.initialize() with try-catch so CDN failure doesn't break entire app; moved stray event listeners into init(); fixed copyHtmlBtn variable reference; fixed backtick escaping in default markdown template literal
