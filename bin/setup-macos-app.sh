#!/bin/bash
# setup-macos-app.sh - Create a native macOS app for the Markdown Editor
# Usage: ./bin/setup-macos-app.sh

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Markdown Editor"
APP_PATH="$DIR/$APP_NAME.app"
CONTENTS="$APP_PATH/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
SCRIPTS_DIR="$RESOURCES/Scripts"

if [ -d "$APP_PATH" ]; then
  echo "Removing existing $APP_NAME.app..."
  rm -rf "$APP_PATH"
fi

echo "Creating $APP_NAME.app..."
mkdir -p "$MACOS" "$RESOURCES" "$SCRIPTS_DIR"

# Bundle index.html inside the app
cp "$DIR/index.html" "$RESOURCES/"

# Create the file-opening helper script in Resources.
# This is called by the AppleScript launcher with (file_path, res_dir) args.
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
  echo "window.__initialContent = atob('$B64');"
  echo "window.__initialFileName = $NAME_JSON;"
  echo "window.__initialFilePath = $FILE_JSON;"
  echo '</script>'
  cat "${RES_DIR}index.html"
} > "$TMP"

open "file://$TMP"
sleep 30 && rm -rf "$TMPDIR" &
HELPER
chmod +x "$RESOURCES/md-open-helper.sh"

# Compile an AppleScript applet as the main executable.
# Shell scripts cannot receive Apple Events, so a plain shell launcher
# never gets the file path when opened via Finder double-click.
# An AppleScript applet handles the 'on open' Apple Event natively.
TMPSCRIPT=$(mktemp /tmp/md-launcher.XXXXXX)
cat > "$TMPSCRIPT" << 'ASCRIPT'
on run
  set resDir to (POSIX path of (path to me)) & "Contents/Resources/"
  do shell script "open " & quoted form of ("file://" & resDir & "index.html")
end run

on open filelist
  set resDir to (POSIX path of (path to me)) & "Contents/Resources/"
  set helper to resDir & "md-open-helper.sh"
  repeat with f in filelist
    set fPath to POSIX path of f
    do shell script (quoted form of helper) & " " & quoted form of fPath & " " & quoted form of resDir
  end repeat
end open
ASCRIPT

TMPAPP_DIR=$(mktemp -d /tmp/md-applet-XXXXXX)
TMPAPP_PATH="$TMPAPP_DIR/applet.app"
osacompile -o "$TMPAPP_PATH" "$TMPSCRIPT"

# Extract the droplet binary and compiled script into our bundle.
# Scripts with 'on open' produce a 'droplet'; those without produce an 'applet'.
# The runtime locates its script via the bundle's Resources directory,
# so renaming the binary does not affect script lookup.
cp "$TMPAPP_PATH/Contents/MacOS/droplet" "$MACOS/md-open"
chmod +x "$MACOS/md-open"
cp "$TMPAPP_PATH/Contents/Resources/Scripts/main.scpt" "$SCRIPTS_DIR/main.scpt"

rm -f "$TMPSCRIPT"
rm -rf "$TMPAPP_DIR"

# Create Info.plist
cat > "$CONTENTS/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>md-open</string>
  <key>CFBundleIdentifier</key>
  <string>com.opencode.md-editor</string>
  <key>CFBundleName</key>
  <string>Markdown Editor</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15</string>
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeName</key>
      <string>Markdown File</string>
      <key>CFBundleTypeRole</key>
      <string>Editor</string>
      <key>LSHandlerRank</key>
      <string>Alternate</string>
      <key>LSItemContentTypes</key>
      <array>
        <string>net.daringfireball.markdown</string>
        <string>public.plain-text</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
PLIST

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
