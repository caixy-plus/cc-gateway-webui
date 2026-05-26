#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../../cc-gateway"
DIST_DIR="$SCRIPT_DIR/../dist"
TARGET_DIR="$BACKEND_DIR/webui/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: $DIST_DIR does not exist. Run 'npm run build' first."
  exit 1
fi

echo "Copying frontend build to backend..."
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -r "$DIST_DIR"/* "$TARGET_DIR"
echo "Done. Copied to $TARGET_DIR"
