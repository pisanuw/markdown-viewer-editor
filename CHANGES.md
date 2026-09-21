2026-05-24 doc Created BRIEFING.md with scope, decisions, non-goals
2026-05-24 code Created index.html: split-pane markdown editor with live preview
2026-05-24 code index.html: added file open/save via File System Access API with fallback; keyboard shortcuts Ctrl+O/S; dirty state indicator
2026-05-24 code index.html: implemented all features - CodeMirror syntax highlighting, resizable splitter, formatting toolbar, dark/light theme, HTML export, print styles, TOC sidebar, scroll sync, auto-save, drag-drop images, find/replace, recent files, file tabs, focus mode
2026-05-24 code Created bin/md-open.sh and bin/setup-macos-app.sh for macOS file association
2026-05-24 fix Fixed macOS scripts: DIR path depth, temp file .html extension, base64 encoding for UTF-8 safety, removed fragile heredoc quoting
2026-05-24 code Bundled index.html inside .app/Contents/Resources/ for self-contained deployment to /Applications
2026-05-24 code Implemented 19 features: KaTeX math, Mermaid diagrams, anchor links, task list toggling, Vim/Emacs keymaps, font size slider, emoji picker, fullscreen, shortcut cheat sheet, spell check, open recent dropdown, workspace save/restore, auto backups, copy HTML, PDF print, present mode, drag tabs, word stats breakdown, preview-only mode
2026-05-24 fix Protected mermaid.initialize() with try-catch so CDN failure doesn't break entire app; moved stray event listeners into init(); fixed copyHtmlBtn variable reference; fixed backtick escaping in default markdown template literal

2026-06-05 fix Finder double-click opened welcome.md instead of target: replaced shell launcher with osacompile droplet so macOS Apple Events (on open) pass the file path correctly; also fixed base64 line-wrapping bug in both scripts (tr -d newline)
2026-06-05 code Added bin/make-zip.sh: rebuilds .app via setup-macos-app.sh then packages with ditto; Markdown Editor.zip now tracked in git for direct download
2026-06-05 note Initialized git repo and pushed to https://github.com/pisanuw/markdown-viewer-editor.git
2026-06-05 fix Eliminated "Press Run" dialog: compile droplet directly to app path so osacompile's full bundle is preserved (PkgInfo, droplet.rsrc, Assets.car, OSAAppletShowStartupScreen=false, CFBundleExecutable=droplet); re-sign with codesign ad-hoc after patching plist; on-open handler runs helper in background for immediate return
2026-06-05 fix Rebuilt Markdown Editor.zip with corrected bundle (23 KB old broken shell-script version replaced with 852 KB proper droplet bundle)

2026-06-06 fix Alternating-empty-tab bug: restoreAutoSaves() was shadowing window.__initialContent; fixed by checking __initialContent before touching localStorage
2026-06-06 fix Droplet "not responding": do shell script now redirects output to /dev/null so it never blocks; removed tell me to quit which caused hang
2026-06-06 decision Each Finder double-click opens a new browser tab (by design); cross-tab IPC attempted but abandoned in favour of simplicity and reliability
2026-06-06 code window.__initialContent now injected as raw base64 (not pre-decoded with atob); index.html decodes correctly, fixing UTF-8 multi-byte characters
2026-06-06 doc Added README.md with features, keyboard shortcuts, usage, and macOS integration explanation

2026-06-24 fix Sanitize rendered markdown with DOMPurify (fail-closed) at both render sites and add a Content-Security-Policy; the app opens untrusted .md files on file:// so unsanitized marked.parse output to innerHTML was an XSS hole
2026-06-24 fix Pin all CDN dependencies to exact versions and add Subresource Integrity + crossorigin to every script/link tag
2026-06-24 fix bin/md-open.sh injected pre-decoded base64 (atob) while index.html expects raw base64; aligned it with md-open-helper.sh so the terminal entry point stops throwing
2026-06-24 fix Surface localStorage autosave failures in the status bar instead of swallowing them silently
2026-06-24 fix Renamed leftover com.opencode.md-editor bundle identifier to com.pisanuw.md-editor
2026-06-24 doc README: removed broken screenshot reference, corrected the false "no dependencies" claim, updated macOS build and distribution sections
2026-06-24 code Added MIT LICENSE
2026-06-24 code Added package.json + vitest/jsdom test suite (XSS sanitization, SRI wiring, base64 entry-point contract) and GitHub Actions CI (test, shellcheck, README link check)
2026-06-24 scope Stopped tracking Markdown Editor.zip (~852KB app bundle); ignore *.zip and distribute via GitHub Releases; purged the blob from all git history (force-push required to update origin)

2026-08-31 test Added test/text-utils.test.js (countWords, headingToId, escapeHtml, escapeAttr, debounce), test/toc.test.js (updateTOC heading parsing and its own XSS surface via data-heading/innerHTML), test/sanitize-more.test.js (more renderMarkdown XSS vectors plus checks that task lists, GFM breaks, KaTeX/Mermaid delimiters, links, and tables survive sanitization); extended test/helpers.js with extractLineFunction()/build() to extract index.html's single-line functions
2026-08-31 doc README: added CI status badge

2026-08-31 code Vendored all CDN dependencies for full offline use: new bin/vendor.sh downloads CodeMirror/marked/DOMPurify/KaTeX (incl. woff2 fonts)/Mermaid at the previously pinned versions, verifies each against the recorded SHA-384 hashes (the old SRI pins, enforced at vendor time instead of load time), and writes vendor/manifest.json with per-file hashes; index.html now loads everything from vendor/ (no CDN, no SRI attrs needed for same-origin files); CSP tightened to local-only sources (file:/'self') with base-uri file: for the launcher's <base> injection
2026-08-31 fix macOS temp-page flow with relative vendor/ paths: md-open.sh and md-open-helper.sh now splice a <base> tag (percent-encoded file:// URL of the install dir) into <head> so the /tmp copy resolves vendor/ assets; sed restricted to first <head> only because the string also appears in exportHtml/copyHtml template literals; setup-macos-app.sh bundles vendor/ into Contents/Resources and refuses to build without it
2026-08-31 test Updated source-guards (no-CDN + local-only CSP guards replace the SRI checks) and entrypoints (base-injection contract incl. a behavioral first-head-only sed check); added test/vendor.test.js: re-hashes every vendored file against manifest.json, rejects stray/missing files, verifies every index.html asset reference resolves, checks KaTeX woff2 fonts, and pins vendored marked/dompurify to the same versions the test suite runs against
2026-08-31 doc README: offline positioning updated (vendor/ directory, no internet required)

2026-09-21 code Files opened from Finder (Markdown Editor.app) or bin/md-open.sh now start in preview-only mode; togglePreviewOnly() takes an optional force arg and refreshes CodeMirror when the editor is shown again (it mis-measures while hidden); Preview button listener wrapped so its click Event is not taken as force
2026-09-21 test Added test/preview-mode.test.js (togglePreviewOnly toggle/force/refresh behavior; guards on the __initialContent branch and the button listener)
2026-09-21 doc README: corrected two stale claims that Finder-opened files join an existing editor window (cross-tab IPC was abandoned 2026-06-06); each double-click opens a new browser tab
