#!/bin/bash
# vendor.sh - Download the pinned third-party libraries into vendor/ and
# verify them against the recorded SHA-384 hashes.
#
# The app used to load these from the jsDelivr CDN with Subresource Integrity.
# They are now vendored so the editor works fully offline (it is positioned as
# a local-first, install-free tool, including the macOS Finder integration).
# The SRI guarantee moves from load time to vendor time: this script refuses
# to write any file whose hash does not match the pin below, and it records
# the hash of every vendored file in vendor/manifest.json, which the test
# suite re-verifies on every run.
#
# Usage: ./bin/vendor.sh
# Requires: curl, openssl, python3

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$DIR/vendor"
CDN="https://cdn.jsdelivr.net/npm"

CODEMIRROR_VERSION=5.65.21
MARKED_VERSION=15.0.7
DOMPURIFY_VERSION=3.4.11
KATEX_VERSION=0.16.11
MERMAID_VERSION=11.15.0
export CODEMIRROR_VERSION MARKED_VERSION DOMPURIFY_VERSION KATEX_VERSION MERMAID_VERSION

# "<npm path> <vendor-relative path> <sha384 pin>"
# The pins are the exact SRI hashes previously carried on the CDN tags in
# index.html.
FILES=(
  "codemirror@$CODEMIRROR_VERSION/lib/codemirror.css codemirror/lib/codemirror.css bsaAhvdduZPAwUb7RRLRvDgtEtOsggrgjkr/EjPO1i/vdoi+DmdLaG79UOt6M5hD"
  "codemirror@$CODEMIRROR_VERSION/addon/dialog/dialog.css codemirror/addon/dialog/dialog.css md19vSE9P4AgqWc2VTrqi+l5aPSvW1m6Fojz+kEpMvFCgZfSY7TB8vcUp6o6ncKU"
  "codemirror@$CODEMIRROR_VERSION/lib/codemirror.js codemirror/lib/codemirror.js YbR2n4zUtdAz2YuqQsJFpjrgTl5SPEm0NG+y8/y3R63tAWTA3O7TOyIWyYYcqUqU"
  "codemirror@$CODEMIRROR_VERSION/mode/markdown/markdown.js codemirror/mode/markdown/markdown.js +DgrmBJvzFFizEu8fQ9BvzcKDPhSyCyRuotcIQIwwtlN+3G+PEqcojPeRE9KhS7u"
  "codemirror@$CODEMIRROR_VERSION/keymap/vim.js codemirror/keymap/vim.js QNfb2uW2pbePXjiJgvRcNHrolEypmVZMzVipQsmbSpdZOCokLU7LskOoKplRxzRU"
  "codemirror@$CODEMIRROR_VERSION/keymap/emacs.js codemirror/keymap/emacs.js Uhen0w7tjEhY6D10sOvXjvFvSswJQFQPUJ7ngPm3mqUsK1vkKoJr+1PXpkIUE1Vc"
  "codemirror@$CODEMIRROR_VERSION/addon/search/search.js codemirror/addon/search/search.js YOqVmw4q7LIontAg+aAO3ue2A9YlY53lFxQyY4JnsmE1/Wdv4NEvyMa04z7nffwb"
  "codemirror@$CODEMIRROR_VERSION/addon/search/searchcursor.js codemirror/addon/search/searchcursor.js Fb0JQymUnTS6/ObRqQC2jFewjRP/5GdhVYdNSrgR5LhWLaTDi2OPvCRqoJlRGrDm"
  "codemirror@$CODEMIRROR_VERSION/addon/dialog/dialog.js codemirror/addon/dialog/dialog.js FV8vL89nnU1VWPuHBUuUYCYWH8ozli0A7PAY8C7CJd4oRDnQZ80UNPQjXcRp6mfq"
  "marked@$MARKED_VERSION/marked.min.js marked/marked.min.js H+hy9ULve6xfxRkWIh/YOtvDdpXgV2fmAGQkIDTxIgZwNoaoBal14Di2YTMR6MzR"
  "dompurify@$DOMPURIFY_VERSION/dist/purify.min.js dompurify/purify.min.js o44XUELLEnv/iSlA1NWxBweqbD4TSR0qgq2VzVsxtkHS989JJjGKSE9vkfo5MN4K"
  "katex@$KATEX_VERSION/dist/katex.min.css katex/katex.min.css nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+"
  "katex@$KATEX_VERSION/dist/katex.min.js katex/katex.min.js 7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg"
  "katex@$KATEX_VERSION/dist/contrib/auto-render.min.js katex/contrib/auto-render.min.js 43gviWU0YVjaDtb/GhzOouOXtZMP/7XUzwPTstBeZFe/+rCMvRwr4yROQP43s0Xk"
  "mermaid@$MERMAID_VERSION/dist/mermaid.min.js mermaid/mermaid.min.js yQ4mmBBT+vhTAwjFH0toJXNYJ6O4usWnt6EPIdWwrRvx2V/n5lXuDZQwQFeSFydF"
)

sha384() {
  openssl dgst -sha384 -binary "$1" | openssl base64 -A
}

fetch() {
  local url="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  curl -fsSL --retry 3 -o "$dest" "$url"
}

echo "Vendoring into $VENDOR ..."
rm -rf "$VENDOR"
mkdir -p "$VENDOR"

for entry in "${FILES[@]}"; do
  read -r npm_path rel_path pin <<< "$entry"
  dest="$VENDOR/$rel_path"
  echo "  $npm_path"
  fetch "$CDN/$npm_path" "$dest"
  actual=$(sha384 "$dest")
  if [ "$actual" != "$pin" ]; then
    echo "ERROR: hash mismatch for $npm_path" >&2
    echo "  expected sha384-$pin" >&2
    echo "  got      sha384-$actual" >&2
    rm -f "$dest"
    exit 1
  fi
done

# KaTeX fonts: katex.min.css references them as url(fonts/....woff2). Parse the
# list out of the css we just verified instead of hardcoding it, so a KaTeX
# version bump can't silently leave fonts behind. Only the woff2 sources are
# vendored: every browser the app supports takes the first (woff2) source and
# never falls back to the woff/ttf entries.
echo "  katex fonts (woff2)"
fonts=$(grep -oE 'url\(fonts/[^)]+\.woff2\)' "$VENDOR/katex/katex.min.css" \
        | sed -E 's/^url\(//; s/\)$//' | sort -u)
if [ -z "$fonts" ]; then
  echo "ERROR: no woff2 fonts found in katex.min.css" >&2
  exit 1
fi
while IFS= read -r font; do
  fetch "$CDN/katex@$KATEX_VERSION/dist/$font" "$VENDOR/katex/$font"
done <<< "$fonts"

# Write the manifest: version pins plus the sha384 of every vendored file.
# The test suite re-hashes every file against this on each run -- the offline
# analogue of SRI.
echo "  manifest.json"
python3 - "$VENDOR" << 'PY'
import base64, hashlib, json, os, sys

vendor = sys.argv[1]
versions_env = ("CODEMIRROR", "MARKED", "DOMPURIFY", "KATEX", "MERMAID")
files = {}
for root, _, names in os.walk(vendor):
    for name in sorted(names):
        if name == "manifest.json":
            continue
        path = os.path.join(root, name)
        rel = os.path.relpath(path, vendor).replace(os.sep, "/")
        with open(path, "rb") as f:
            digest = hashlib.sha384(f.read()).digest()
        files[rel] = "sha384-" + base64.b64encode(digest).decode()

manifest = {
    "libraries": {k.lower(): os.environ[k + "_VERSION"] for k in versions_env},
    "files": dict(sorted(files.items())),
}
with open(os.path.join(vendor, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
    f.write("\n")
print(f"    {len(files)} files")
PY

echo ""
echo "Done. Vendored $(du -sh "$VENDOR" | cut -f1) into vendor/"
