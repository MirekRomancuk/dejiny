#!/usr/bin/env bash
#
# Safe FTP deploy to Forpsi for the `web.dejinykorunyceske.cz` subdomain.
#
# Guard rails:
#   - REMOTE_DIR must start with /www/ AND end with /web (or /<something>).
#     The script refuses to run with a bare /www/ or any path that could touch the Joomla root.
#   - Only files inside ./dist/ are uploaded.
#   - Files are uploaded individually via curl --ftp-create-dirs. No recursive delete is performed.
#
# Usage:
#   1. Copy .env.deploy.example to .env.deploy and fill FTP creds.
#   2. ./scripts/deploy-ftp.sh           # build + upload
#      ./scripts/deploy-ftp.sh --skip-build   # upload existing dist/ only
#      ./scripts/deploy-ftp.sh --dry-run      # list files that would be uploaded, do nothing
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ---- Load credentials ----
if [ ! -f .env.deploy ]; then
  echo "✗ .env.deploy not found. Copy .env.deploy.example and fill in FTP creds." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
. ./.env.deploy
set +a

: "${FTP_HOST:?FTP_HOST missing in .env.deploy}"
: "${FTP_USER:?FTP_USER missing in .env.deploy}"
: "${FTP_PASS:?FTP_PASS missing in .env.deploy}"
: "${FTP_REMOTE_DIR:?FTP_REMOTE_DIR missing in .env.deploy}"

# ---- Safety check: reject paths that could touch Joomla ----
case "$FTP_REMOTE_DIR" in
  /www | /www/ | /www/administrator* | /www/components* | /www/modules* | /www/plugins* | /www/templates* | /www/images* | /www/libraries* | /www/language*)
    echo "✗ FTP_REMOTE_DIR='$FTP_REMOTE_DIR' is unsafe — would touch the Joomla root." >&2
    echo "  Use a subdomain folder like /www/web instead." >&2
    exit 1
    ;;
  /www/*) : ;;  # OK
  /subdoms/*) : ;;  # subdomény (dev.dejinykorunyceske.cz → /subdoms/dev) OK
  *)
    echo "✗ FTP_REMOTE_DIR='$FTP_REMOTE_DIR' must be under /www/ or /subdoms/." >&2
    exit 1
    ;;
esac

# ---- Parse args ----
SKIP_BUILD=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --dry-run)    DRY_RUN=1 ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# ---- Build ----
if [ "$SKIP_BUILD" = "0" ]; then
  echo "▸ Building production bundle..."
  npm run build
fi

if [ ! -d dist ]; then
  echo "✗ dist/ not found." >&2
  exit 1
fi

if [ ! -f dist/.htaccess ]; then
  echo "✗ dist/.htaccess not found — SPA routing will break. Aborting." >&2
  exit 1
fi

# ---- Strip trailing slash from remote ----
FTP_REMOTE_DIR="${FTP_REMOTE_DIR%/}"

# ---- Upload ----
echo ""
echo "▸ Target: ftp://$FTP_HOST$FTP_REMOTE_DIR/"
echo "▸ Source: $(pwd)/dist/"
echo "▸ Dry run: $DRY_RUN"
echo ""

count=0
errors=0
while IFS= read -r -d '' file; do
  rel="${file#dist/}"
  remote="$FTP_REMOTE_DIR/$rel"
  count=$((count + 1))
  printf "  [%3d] %-58s " "$count" "$rel"
  if [ "$DRY_RUN" = "1" ]; then
    echo "→ would upload to $remote"
  else
    if curl -sS --ftp-create-dirs --connect-timeout 30 -T "$file" \
         "ftp://$FTP_USER:$FTP_PASS@$FTP_HOST$remote" 2>/tmp/dkc-ftp-err; then
      echo "✓"
    else
      echo "✗"
      cat /tmp/dkc-ftp-err >&2
      errors=$((errors + 1))
    fi
  fi
done < <(find dist -type f -print0)

echo ""
if [ "$DRY_RUN" = "1" ]; then
  echo "✓ Dry run complete: $count files would be uploaded."
elif [ "$errors" -eq 0 ]; then
  echo "✓ Deployed $count files."
  echo "  Cíl: $FTP_REMOTE_DIR (dev → https://dev.dejinykorunyceske.cz, web → https://web.dejinykorunyceske.cz)"
else
  echo "⚠ Deployed $count files, $errors failed. Check error log above." >&2
  exit 1
fi
