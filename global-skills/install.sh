#!/usr/bin/env bash
# Install global Cursor skills to your user-level skill directories.
# Run once on your machine — applies to ALL Cursor projects.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILL="npm-trusted-publishing"

for DIR in "$HOME/.cursor/skills" "$HOME/.agents/skills"; do
  mkdir -p "$DIR"
  rm -rf "$DIR/$SKILL"
  cp -r "$ROOT/$SKILL" "$DIR/"
  echo "✓ Installed $SKILL → $DIR/$SKILL"
done

echo ""
echo "Restart Cursor or open a new Agent chat."
echo "Invoke manually: /npm-trusted-publishing"
echo "Or let Agent pick it up when editing package.json / .github/workflows/"
