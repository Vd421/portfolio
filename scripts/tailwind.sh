#!/usr/bin/env bash
# Tailwind CSS via the standalone CLI binary: no Node, no npm.
# Usage: scripts/tailwind.sh [build|watch]
set -euo pipefail
VERSION="v4.3.3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/bin/tailwindcss-$VERSION"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)  ASSET="tailwindcss-linux-x64" ;;
  Linux-aarch64) ASSET="tailwindcss-linux-arm64" ;;
  Darwin-arm64)  ASSET="tailwindcss-macos-arm64" ;;
  Darwin-x86_64) ASSET="tailwindcss-macos-x64" ;;
  *) echo "Unsupported platform: $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

if [[ ! -x "$BIN" ]]; then
  mkdir -p "$ROOT/bin"
  echo "Downloading Tailwind $VERSION ($ASSET)…"
  curl -fsSL -o "$BIN" "https://github.com/tailwindlabs/tailwindcss/releases/download/$VERSION/$ASSET"
  chmod +x "$BIN"
fi

IN="$ROOT/static/css/input.css"
OUT="$ROOT/static/dist/app.css"
mkdir -p "$(dirname "$OUT")"
if [[ "${1:-build}" == "watch" ]]; then
  exec "$BIN" -i "$IN" -o "$OUT" --watch
else
  exec "$BIN" -i "$IN" -o "$OUT" --minify
fi
