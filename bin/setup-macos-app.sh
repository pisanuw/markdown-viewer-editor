#!/bin/bash
# setup-macos-app.sh - Create a native macOS app for the Markdown Editor
# Usage: ./bin/setup-macos-app.sh

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Markdown Editor"
APP_PATH="$DIR/$APP_NAME.app"
CONTENTS="$APP_PATH/Contents"
RESOURCES="$CONTENTS/Resources"
PLIST="$CONTENTS/Info.plist"

if [ -d "$APP_PATH" ]; then
  echo "Removing existing $APP_NAME.app..."
  rm -rf "$APP_PATH"
fi

echo "Building AppleScript droplet..."

# Compile the droplet directly to the final app path so osacompile creates the
# complete bundle: PkgInfo, droplet.rsrc, Assets.car, code signature, etc.
# Extracting just the binary into a hand-crafted bundle (the previous approach)
# left out the resources macOS needs to deliver Apple Events, and also dropped
# OSAAppletShowStartupScreen=false, causing the "Press Run" dialog.
TMPSCRIPT=$(mktemp /tmp/md-launcher.XXXXXX)
cat > "$TMPSCRIPT" << 'ASCRIPT'
on run
  set resDir to (POSIX path of (path to me)) & "Contents/Resources/"
  do shell script "open " & quoted form of ("file://" & resDir & "index.html") & " &"
end run

on open filelist
  set resDir to (POSIX path of (path to me)) & "Contents/Resources/"
  set helper to resDir & "md-open-helper.sh"
  repeat with f in filelist
    set fPath to POSIX path of f
    do shell script (quoted form of helper) & " " & quoted form of fPath & " " & quoted form of resDir & " > /dev/null 2>&1 &"
  end repeat
end open
ASCRIPT

osacompile -o "$APP_PATH" "$TMPSCRIPT"
rm -f "$TMPSCRIPT"

# Add our resources to the osacompile-generated bundle
cp "$DIR/index.html" "$RESOURCES/"

cat > "$RESOURCES/md-open-helper.sh" << 'HELPER'
#!/bin/bash
set -euo pipefail
FILE="$1"
RES_DIR="$2"

NAME=$(basename "$FILE")
# tr -d '\n' strips the line-wrapping macOS base64 adds (76-char limit)
# so the value fits in a single-line JS string literal
B64=$(base64 < "$FILE" | tr -d '\n')
NAME_JSON=$(python3 -c "import sys,json; print(json.dumps(sys.argv[1]))" "$NAME")
FILE_JSON=$(python3 -c "import sys,json; print(json.dumps(sys.argv[1]))" "$FILE")

TMPDIR=$(mktemp -d /tmp/md-editor-XXXXXX)
TMP="$TMPDIR/editor.html"

{
  echo '<script>'
  echo "window.__initialContent = '$B64';"
  echo "window.__initialFileName = $NAME_JSON;"
  echo "window.__initialFilePath = $FILE_JSON;"
  echo '</script>'
  cat "${RES_DIR}index.html"
} > "$TMP"

open "file://$TMP"
sleep 30 && rm -rf "$TMPDIR" &
HELPER
chmod +x "$RESOURCES/md-open-helper.sh"

# Patch the plist: update bundle name/ID and replace the generic wildcard
# document type with our specific markdown types.
# CFBundleExecutable stays as 'droplet' (osacompile's value) — renaming it
# breaks Apple Event delivery.
/usr/libexec/PlistBuddy -c "Set :CFBundleName 'Markdown Editor'" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.opencode.md-editor" "$PLIST" \
  2>/dev/null || /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.opencode.md-editor" "$PLIST"
/usr/libexec/PlistBuddy -c "Delete :CFBundleDocumentTypes" "$PLIST"
/usr/libexec/PlistBuddy \
  -c "Add :CFBundleDocumentTypes array" \
  -c "Add :CFBundleDocumentTypes:0 dict" \
  -c "Add :CFBundleDocumentTypes:0:CFBundleTypeName string 'Markdown File'" \
  -c "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Editor" \
  -c "Add :CFBundleDocumentTypes:0:LSHandlerRank string Alternate" \
  -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" \
  -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string net.daringfireball.markdown" \
  -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:1 string public.plain-text" \
  "$PLIST"

# Re-sign after modifying the bundle (ad-hoc; no Developer ID required)
codesign --force --deep --sign - "$APP_PATH"

# Register with LaunchServices
LSREG=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
"$LSREG" -f "$APP_PATH" 2>/dev/null || true

echo ""
echo "Done! Created $APP_PATH"
echo ""
echo "To use it:"
echo "  1. Right-click any .md file -> Open With -> Other..."
echo "  2. Select $APP_NAME.app"
echo "  3. To set as default: Get Info -> Open With -> $APP_NAME -> Change All"
echo ""
