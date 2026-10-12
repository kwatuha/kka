#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/website/azimkim"
OUT="$ROOT/dist"
ZIP="$OUT/azimkim-website.zip"

if [[ ! -f "$SRC/index.html" ]]; then
  echo "Missing $SRC/index.html" >&2
  exit 1
fi

mkdir -p "$OUT"
rm -f "$ZIP"
(cd "$SRC" && zip -r "$ZIP" . -x '*.DS_Store' -x 'assets.zip')

echo "Created $ZIP"
echo "Upload to cPanel and extract into public_html (see deploy/CPANEL_AZIMKIM_WEBSITE.md)"
