#!/usr/bin/env bash

set -euo pipefail

if [[ "${OSTYPE:-}" != linux* ]]; then
  echo "This installer only supports Linux." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required to install Cortex. Install it first: https://bun.sh" >&2
  exit 1
fi

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
APP_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
BIN_DIR="$HOME/.local/bin"
TARGET_PATH="$BIN_DIR/cortex"
SOURCE_LAUNCHER="$APP_DIR/bin/cortex"

if [[ ! -f "$SOURCE_LAUNCHER" ]]; then
  echo "Missing launcher script: $SOURCE_LAUNCHER" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"

if [[ ! -d "$APP_DIR/node_modules" ]]; then
  echo "Installing dependencies with Bun..."
  (cd "$APP_DIR" && bun install)
fi

if [[ ! -e "$APP_DIR/node_modules/@cortex/sdk" || ! -e "$APP_DIR/node_modules/@cortex/shared" ]]; then
  cat >&2 <<EOF
Cortex depends on local workspace packages that are not available in this checkout.

Expected:
  $APP_DIR/node_modules/@cortex/sdk
  $APP_DIR/node_modules/@cortex/shared

Install from the full Cortex repository, then run this installer again.
EOF
  exit 1
fi

ln -sfn "$SOURCE_LAUNCHER" "$TARGET_PATH"
chmod +x "$SOURCE_LAUNCHER"

case ":$PATH:" in
  *":$BIN_DIR:"*) PATH_HINT="" ;;
  *)
    PATH_HINT="Add this line to your shell profile if needed:
  export PATH=\"\$HOME/.local/bin:\$PATH\""
    ;;
esac

cat <<EOF
Installed Cortex launcher:
  $TARGET_PATH

Run:
  cortex

$PATH_HINT
EOF
