#!/bin/bash
# make-zip.sh - Build the macOS app and package it for download
# Usage: ./bin/make-zip.sh

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Markdown Editor"
APP_PATH="$DIR/$APP_NAME.app"
ZIP_PATH="$DIR/$APP_NAME.zip"

echo "Building $APP_NAME.app..."
bash "$DIR/bin/setup-macos-app.sh"

echo "Creating $APP_NAME.zip..."
rm -f "$ZIP_PATH"
# ditto preserves app bundle metadata and resource forks without __MACOSX junk
ditto -c -k --sequesterRsrc --keepParent "$APP_PATH" "$ZIP_PATH"

echo ""
echo "Done! Created $ZIP_PATH"
echo "Size: $(du -sh "$ZIP_PATH" | cut -f1)"
