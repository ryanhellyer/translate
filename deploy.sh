#!/bin/bash
#
# Deploy a generic PHP app: push the working tree over rsync, then run the
# post-deploy steps over SSH.
#
# This script assumes a conventional PHP layout: a public/ directory that is the
# web root (public/index.php front controller), plus whatever else the app ships.
# It makes no assumptions about a framework: no console binary, no migrations,
# no asset pipeline. Composer is run only if the app actually has a composer.json.
#
# There is no build step: public/scripts.js is hand-written source, so what is
# in the tree is what runs in the browser.
#
# Usage:
#   ./deploy.sh
#
# Env overrides:
#   PROD_HOST  SSH target, e.g. ryan@example.com
#   PROD_PATH  Remote web root (the parent of public/, i.e. where the tree lands)
#   SITE_URL   Base URL used for the smoke test
#   SMOKE_PATH Path to fetch for the smoke test (default "/")

PROD_HOST="${PROD_HOST:-ryan@hellyer.kiwi}"
PROD_PATH="${PROD_PATH:-~/www/translate.hellyer.kiwi/}"
SITE_URL="${SITE_URL:-https://translate.hellyer.kiwi}"
SMOKE_PATH="${SMOKE_PATH:-/}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Things that must never be shipped or must not clobber the server's own copy.
EXCLUDES=(
    --exclude='.env'
    --exclude='.env.*'
    --exclude='.env.local'
    --exclude='.env.local.php'
    --exclude='.git/'
    --exclude='.gitignore'
    --exclude='.gitattributes'
    --exclude='deploy.sh'
    --exclude='*.log'
    --exclude='access.log'
    --exclude='error.log'
)

echo "Deploying to ${PROD_HOST}:${PROD_PATH}..."

# A non-interactive SSH session does not source ~/.bashrc or ~/.profile, so
# tools installed under $HOME (.local/bin, .composer/vendor/bin, ...) are not on
# PATH. Prepend the usual locations so composer/php resolve the same way they do
# in a login shell.
REMOTE_PATH='export PATH="$HOME/.local/bin:$HOME/.composer/vendor/bin:$HOME/.config/composer/vendor/bin:/usr/local/bin:$PATH"'

# Preflight: php is required to serve the app; composer only if the app uses it.
# Verify both resolve in the same non-interactive shell the deploy uses, so a
# "command not found" surfaces before any work happens.
echo "Checking remote toolchain..."
if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v php >/dev/null"; then
    echo "" >&2
    echo "x Preflight FAILED: php not found on ${PROD_HOST}." >&2
    echo "  Remote PATH:  $(ssh "${PROD_HOST}" 'echo $PATH' 2>/dev/null)" >&2
    echo "  php:       $(ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v php" 2>/dev/null || echo 'NOT FOUND')" >&2
    echo "  Add the missing directory to REMOTE_PATH in this script." >&2
    exit 1
fi
echo "OK Remote php found"

# Composer is optional. If the app has a composer.json locally, it must resolve on
# the server too, since we will run install there.
if [ -f "${SCRIPT_DIR}/composer.json" ]; then
    if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v composer >/dev/null"; then
        echo "" >&2
        echo "x Preflight FAILED: composer.json present but composer not found on ${PROD_HOST}." >&2
        echo "  composer:  $(ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v composer" 2>/dev/null || echo 'NOT FOUND')" >&2
        echo "  Add whichever directory is missing to REMOTE_PATH in this script." >&2
        exit 1
    fi
    echo "OK Remote composer found"
fi

rsync -avz --delete "${EXCLUDES[@]}" \
    "${SCRIPT_DIR}/" \
    "${PROD_HOST}:${PROD_PATH}"

# Post-deploy: only the steps that apply to this app. Each is conditional, so the
# script stays correct whether the app is dependency-free or Composer-managed, and
# whether or not PHP is running as a long-lived process with an opcode cache.
echo ""
echo "Running post-deploy commands..."

REMOTE_STEPS="cd ${PROD_PATH}"

# 1. Composer dependencies — only when the app actually has a composer.json.
if [ -f "${SCRIPT_DIR}/composer.json" ]; then
    REMOTE_STEPS="${REMOTE_STEPS} && composer install --no-dev --optimize-autoloader"
fi

# 2. Reset the opcode cache so the new files are picked up. Harmless if opcache
#    is not enabled; guarded with function_exists so it cannot error.
REMOTE_STEPS="${REMOTE_STEPS} && php -r 'if (function_exists(\"opcache_reset\")) { opcache_reset(); }'"

if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && ${REMOTE_STEPS}"; then
    echo "" >&2
    echo "x Post-deploy commands FAILED on ${PROD_HOST}." >&2
    echo "  Re-run the failing step by hand to see the full error:" >&2
    echo "    ssh ${PROD_HOST} '${REMOTE_PATH} && cd ${PROD_PATH} && <command>'" >&2
    exit 1
fi

# Smoke test: the app must answer over HTTP. A generic PHP front controller
# returns 200 for a healthy route; anything else means the deploy did not take.
echo ""
echo "Running smoke test..."
SMOKE_URL="${SITE_URL}${SMOKE_PATH}"
SMOKE_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "${SMOKE_URL}" 2>/dev/null || echo 000)"
if [ "${SMOKE_STATUS}" != "200" ]; then
    if [ "${SMOKE_STATUS}" = "000" ]; then
        echo "x Smoke test FAILED: cannot reach ${SMOKE_URL}" >&2
    else
        echo "x Smoke test FAILED: ${SMOKE_URL} returned HTTP ${SMOKE_STATUS} (expected 200)" >&2
    fi
    exit 1
fi
echo "OK Smoke test passed (HTTP 200: ${SMOKE_URL})"

# The served script must be the one in this tree, not a stale copy left on the
# server. scripts.js is hand-written source now, so a simple checksum comparison
# catches a deploy that silently did not update it.
echo ""
echo "Verifying the served script..."
LOCAL_SUM="$(cksum < "${SCRIPT_DIR}/public/scripts.js" | awk '{print $1}')"
SERVED_SUM="$(curl -sS "${SITE_URL}/scripts.js" 2>/dev/null | cksum | awk '{print $1}')"
if [ -z "${SERVED_SUM}" ] || [ "${SERVED_SUM}" = "4294967295" ]; then
    echo "x Script check FAILED: could not fetch ${SITE_URL}/scripts.js" >&2
    exit 1
fi
if [ "${LOCAL_SUM}" != "${SERVED_SUM}" ]; then
    echo "x Script check FAILED: the served scripts.js does not match this tree." >&2
    echo "  local:  ${LOCAL_SUM}" >&2
    echo "  served: ${SERVED_SUM}" >&2
    echo "  The deploy did not update it; check the rsync output above." >&2
    exit 1
fi
echo "OK Served script matches this tree"

echo ""
echo "✓ Deploy complete!"
