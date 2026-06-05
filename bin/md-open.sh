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

# Create temp dir so the .html extension is clean
TMPDIR=$(mktemp -d /tmp/md-editor-XXXXXX)
TMP="$TMPDIR/editor.html"

# Build temp HTML: inject content, then append the editor
{
  echo '<script>'
  echo "window.__initialContent = atob('$B64');"
  echo "window.__initialFileName = $NAME_JSON;"
  echo "window.__initialFilePath = $FILE_JSON;"
  echo '</script>'
  cat "$DIR/index.html"
} > "$TMP"

open "file://$TMP"

# Clean up after 30 seconds
sleep 30 && rm -rf "$TMPDIR" &
