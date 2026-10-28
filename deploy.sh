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
    --exclude='node_modules/'
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

# The browser bundle is compiled on the server, so Node.js must resolve there
# too - but only when this app actually builds a bundle.
if [ -f "${SCRIPT_DIR}/build-server.sh" ]; then
    if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v node >/dev/null"; then
        echo "" >&2
        echo "x Preflight FAILED: build-server.sh present but node not found on ${PROD_HOST}." >&2
        echo "  node:      $(ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v node" 2>/dev/null || echo 'NOT FOUND')" >&2
        echo "  The bundle is compiled on the server during deploy, so Node.js and" >&2
        echo "  a TypeScript compiler must be installed there:" >&2
        echo "    ssh ${PROD_HOST} 'sudo apt-get install -y nodejs && sudo npm install -g typescript'" >&2
        exit 1
    fi
    echo "OK Remote node found"
fi

# public/scripts.js is gitignored build output, so the copy on the deploying
# machine may be stale (built from older source or an older tsconfig). It is
# rebuilt on the server below from the src/ that was just pushed, so exclude
# it here and never ship a bundle that does not match the source.
rsync -avz --delete "${EXCLUDES[@]}" \
    --exclude='public/scripts.js' \
    "${SCRIPT_DIR}/" \
    "${PROD_HOST}:${PROD_PATH}"

# Post-deploy: only the steps that apply to this app. Each is conditional, so the
# script stays correct whether the app is dependency-free or Composer-managed, and
# whether or not PHP is running as a long-lived process with an opcode cache.
echo ""
echo "Running post-deploy commands..."

REMOTE_STEPS="cd ${PROD_PATH}"

# 1. Rebuild the browser bundle from the src/ that was just pushed. This is
#    why public/scripts.js is excluded from the rsync: the bundle is build
#    output, and shipping a stale one (compiled from older source, or an older
#    tsconfig) is how a deploy ends up serving code that does not match the
#    repo. build-server.sh needs only tsc, which the preflight confirmed.
if [ -f "${SCRIPT_DIR}/build-server.sh" ]; then
    REMOTE_STEPS="${REMOTE_STEPS} && ./build-server.sh"
fi

# 2. Composer dependencies — only when the app actually has a composer.json.
if [ -f "${SCRIPT_DIR}/composer.json" ]; then
    REMOTE_STEPS="${REMOTE_STEPS} && composer install --no-dev --optimize-autoloader"
fi

# 3. Reset the opcode cache so the new files are picked up. Harmless if opcache
#    is not enabled; guarded with function_exists so it cannot error.
REMOTE_STEPS="${REMOTE_STEPS} && php -r 'if (function_exists(\"opcache_reset\")) { opcache_reset(); }'"

if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && ${REMOTE_STEPS}"; then
    echo "" >&2
    echo "x Post-deploy commands FAILED on ${PROD_HOST}." >&2
    echo "  Re-run the failing step by hand to see the full error:" >&2
    echo "    ssh ${PROD_HOST} '${REMOTE_PATH} && cd ${PROD_PATH} && <command>'" >&2
    if [ -f "${SCRIPT_DIR}/build-server.sh" ]; then
        echo "" >&2
        echo "  The bundle is compiled on the server. If the failure came from" >&2
        echo "  build-server.sh, run it by itself to see why:" >&2
        echo "    ssh ${PROD_HOST} '${REMOTE_PATH} && cd ${PROD_PATH} && ./build-server.sh'" >&2
    fi
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

echo ""
echo "✓ Deploy complete!"
