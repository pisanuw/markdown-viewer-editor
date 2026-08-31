#!/bin/bash
# md-open.sh - Open a .md file in the markdown editor (macOS)
# Usage: ./bin/md-open.sh path/to/file.md

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <markdown-file>"
  exit 1
fi

FILE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE"
  exit 1
fi

DIR="$(cd "$(dirname "$0")/.." && pwd)"
NAME=$(basename "$FILE")
B64=$(base64 < "$FILE" | tr -d '\n')
NAME_JSON=$(python3 -c "import sys,json; print(json.dumps(sys.argv[1]))" "$NAME")
FILE_JSON=$(python3 -c "import sys,json; print(json.dumps(sys.argv[1]))" "$FILE")
# file:// URL of the repo root, percent-encoded (the path may contain spaces).
# quote() emits only URL-safe characters, so the value is also safe to splice
# into the sed replacement below.
DIR_URL=$(python3 -c "import sys,urllib.parse; print('file://' + urllib.parse.quote(sys.argv[1]) + '/')" "$DIR")

# Create temp dir so the .html extension is clean
TMPDIR=$(mktemp -d /tmp/md-editor-XXXXXX)
TMP="$TMPDIR/editor.html"

# Build temp HTML: inject content, then append the editor.
# __initialContent is injected as RAW base64; index.html decodes it with atob().
# This must match Markdown Editor.app's md-open-helper.sh (see setup-macos-app.sh).
# Pre-decoding here would make index.html atob() a plain-text string and throw.
# A <base> tag is spliced into <head> so the temp copy resolves its relative
# vendor/ asset paths against the real repo directory instead of $TMPDIR.
# The 1,/<head>/ range restricts sed to the FIRST <head> (line 3): the string
# also appears inside JS template literals (exportHtml/copyHtml), and a global
# replace would inject the base tag into every exported HTML document. The
# range form works in both BSD (macOS) and GNU sed.
{
  echo '<script>'
  echo "window.__initialContent = '$B64';"
  echo "window.__initialFileName = $NAME_JSON;"
  echo "window.__initialFilePath = $FILE_JSON;"
  echo '</script>'
  sed "1,/<head>/s|<head>|<head><base href=\"$DIR_URL\">|" "$DIR/index.html"
} > "$TMP"

open "file://$TMP"

# Clean up after 30 seconds
sleep 30 && rm -rf "$TMPDIR" &
