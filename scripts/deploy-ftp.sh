#!/usr/bin/env bash
#
# Safe FTPS deploy to Forpsi.
#
# Guard rails:
#   - A bare /www production target requires FTP_ALLOW_PRODUCTION_ROOT=yes.
#   - Other targets must be below /www/ or /subdoms/.
#   - Only files inside ./dist/ are uploaded.
#   - Files are uploaded individually over explicit TLS. No recursive delete is performed.
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
: "${FTP_REMOTE_DIR:?FTP_REMOTE_DIR missing in .env.deploy}"

if [ -n "${FTP_PASS_B64:-}" ]; then
  if ! FTP_PASS="$(printf '%s' "$FTP_PASS_B64" | base64 --decode 2>/dev/null)"; then
    echo "✗ FTP_PASS_B64 in .env.deploy is not valid Base64." >&2
    exit 1
  fi
fi
: "${FTP_PASS:?FTP_PASS or FTP_PASS_B64 missing in .env.deploy}"

# ---- Safety check: production root must be explicitly authorized ----
case "$FTP_REMOTE_DIR" in
  /www | /www/)
    if [ "${FTP_ALLOW_PRODUCTION_ROOT:-no}" != "yes" ]; then
      echo "✗ Production root /www requires FTP_ALLOW_PRODUCTION_ROOT=yes." >&2
      exit 1
    fi
    ;;
  /www/*) : ;;
  /subdoms/*) : ;;
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
    if curl -sS --ftp-create-dirs --ssl-reqd --ftp-pasv --connect-timeout 30 \
         --user "$FTP_USER:$FTP_PASS" -T "$file" \
         "ftp://$FTP_HOST$remote" 2>/tmp/dkc-ftp-err; then
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
  echo "  Cíl: $FTP_REMOTE_DIR"
else
  echo "⚠ Deployed $count files, $errors failed. Check error log above." >&2
  exit 1
fi
