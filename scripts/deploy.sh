#!/usr/bin/env bash
set -euo pipefail

# Build & deploy script for dejinykorunyceske.cz
# Produces dist/ ready to upload to shared Apache hosting.
#
# Usage:
#   ./scripts/deploy.sh build      # just build
#   ./scripts/deploy.sh rsync user@host:/path  # build + rsync
#
# After upload:
#   - Verify https://dejinykorunyceske.cz/ loads
#   - Verify https://dejinykorunyceske.cz/popis (SPA rewrite via .htaccess)
#   - Verify https://dejinykorunyceske.cz/admin/login

cd "$(dirname "$0")/.."

CMD="${1:-build}"

echo "▸ Cleaning dist/"
rm -rf dist/

echo "▸ Installing deps (frozen)"
npm ci

echo "▸ Type-check"
npm run typecheck

echo "▸ Production build"
npm run build

echo "▸ Verifying dist/"
test -f dist/index.html       || { echo "FAIL: missing dist/index.html"; exit 1; }
test -f dist/.htaccess        || { echo "FAIL: missing dist/.htaccess - SPA rewrite won't work!"; exit 1; }
test -d dist/assets           || { echo "FAIL: missing dist/assets/"; exit 1; }
echo "  dist size: $(du -sh dist/ | awk '{print $1}')"
echo "  files:"
ls -la dist/

if [ "$CMD" = "rsync" ] && [ -n "${2:-}" ]; then
  TARGET="$2"
  echo "▸ Backing up remote..."
  STAMP=$(date +%Y%m%d-%H%M%S)
  # Try to back up existing remote dist before overwriting
  ssh "${TARGET%%:*}" "if [ -d \"${TARGET#*:}\" ]; then cp -r \"${TARGET#*:}\" \"${TARGET#*:}-backup-$STAMP\"; fi" || echo "  (backup step skipped - target may not exist yet)"
  echo "▸ Rsync to $TARGET"
  rsync -avz --delete dist/ "$TARGET/"
  echo "✓ Deployed."
fi

echo "✓ Done."
