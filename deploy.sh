#!/bin/bash
#
# Deploy a generic PHP app: push the working tree over rsync, then run the
# post-deploy steps over SSH.
#
# This script assumes a conventional PHP layout: a public/ directory that is the
# web root (public/index.php front controller), plus whatever else the app ships.
# It makes no assumptions about a framework: no console binary, no migrations.
# Composer is run only if the app actually has a composer.json.
#
# The browser code is TypeScript in src/. It is compiled on the server after the
# upload, so the modules the browser loads always match the source that was just
# deployed. public/js/ is build output and is never shipped.
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
    --exclude='public/js/'
    --exclude='.build/'
    --exclude='deploy.sh'
    --exclude='*.log'
    --exclude='access.log'
    --exclude='error.log'
)

echo "Deploying to ${PROD_HOST}:${PROD_PATH}..."

# A non-interactive SSH session does not source ~/.bashrc or ~/.profile, so
# tools installed under $HOME (.local/bin, .composer/vendor/bin, ...) are not on
# PATH. Prepend the usual locations so composer/php/node resolve the same way
# they do in a login shell.
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

# The browser modules are compiled on the server, so Node.js and a TypeScript
# compiler must resolve there too. build.sh --no-install uses a global tsc or
# npx; no npm install is required on the server.
if [ -f "${SCRIPT_DIR}/build.sh" ]; then
    if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v node >/dev/null"; then
        echo "" >&2
        echo "x Preflight FAILED: build.sh present but node not found on ${PROD_HOST}." >&2
        echo "  node:      $(ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v node" 2>/dev/null || echo 'NOT FOUND')" >&2
        echo "  The TypeScript is compiled on the server during deploy, so install" >&2
        echo "  Node.js there, or set TSC=/path/to/tsc in the remote environment." >&2
        exit 1
    fi

    if ! ssh "${PROD_HOST}" "${REMOTE_PATH} && { command -v tsc >/dev/null || command -v npx >/dev/null; }"; then
        echo "" >&2
        echo "x Preflight FAILED: no TypeScript compiler found on ${PROD_HOST}." >&2
        echo "  tsc:       $(ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v tsc" 2>/dev/null || echo 'NOT FOUND')" >&2
        echo "  npx:       $(ssh "${PROD_HOST}" "${REMOTE_PATH} && command -v npx" 2>/dev/null || echo 'NOT FOUND')" >&2
        echo "  Install one with: ssh ${PROD_HOST} 'sudo npm install -g typescript'" >&2
        echo "  ...or set TSC=/path/to/tsc in the remote environment." >&2
        exit 1
    fi
    echo "OK Remote node and TypeScript compiler found"
fi

# public/js/ is build output, so it is excluded here and rebuilt on the server.
# Shipping a stale copy is how a deploy ends up serving code that does not match
# the source that is in the repository.
rsync -avz --delete "${EXCLUDES[@]}" \
    "${SCRIPT_DIR}/" \
    "${PROD_HOST}:${PROD_PATH}"

# Post-deploy: only the steps that apply to this app. Each is conditional, so the
# script stays correct whether the app is dependency-free or Composer-managed, and
# whether or not PHP is running as a long-lived process with an opcode cache.
echo ""
echo "Running post-deploy commands..."

REMOTE_STEPS="cd ${PROD_PATH}"

# 1. Compile src/ into public/js/ on the server. This runs after the upload, so
#    the modules the browser gets are built from the source just deployed.
if [ -f "${SCRIPT_DIR}/build.sh" ]; then
    REMOTE_STEPS="${REMOTE_STEPS} && bash ./build.sh --no-install"
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
    if [ -f "${SCRIPT_DIR}/build.sh" ]; then
        echo "" >&2
        echo "  If the failure came from the TypeScript build, run it by itself:" >&2
        echo "    ssh ${PROD_HOST} '${REMOTE_PATH} && cd ${PROD_PATH} && bash ./build.sh --no-install'" >&2
    fi
    exit 1
fi

# Smoke test: the app must answer over HTTP. A generic PHP front controller
# returns 200 for a healthy route; anything else means the deploy did not take.
echo ""
echo "Running smoke test..."
CACHE_BUST="$(date +%s)"
SMOKE_URL="${SITE_URL}${SMOKE_PATH}"
SMOKE_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "${SMOKE_URL}?deploy=${CACHE_BUST}" 2>/dev/null || echo 000)"
if [ "${SMOKE_STATUS}" != "200" ]; then
    if [ "${SMOKE_STATUS}" = "000" ]; then
        echo "x Smoke test FAILED: cannot reach ${SMOKE_URL}" >&2
    else
        echo "x Smoke test FAILED: ${SMOKE_URL} returned HTTP ${SMOKE_STATUS} (expected 200)" >&2
    fi
    exit 1
fi
echo "OK Smoke test passed (HTTP 200: ${SMOKE_URL})"

# The served modules must be the ones the server just built, not an older copy
# left behind by a deploy that silently did not update them.
echo ""
echo "Verifying the served modules..."
HOME_HTML="$(curl -sS "${SITE_URL}/?deploy=${CACHE_BUST}" 2>/dev/null || true)"
if ! printf '%s' "${HOME_HTML}" | grep -q 'src="/js/main.js"'; then
    echo "x Module check FAILED: ${SITE_URL}/ does not load /js/main.js." >&2
    echo "  Check that templates/home.php was deployed." >&2
    exit 1
fi

REMOTE_MODULES="$(ssh "${PROD_HOST}" "${REMOTE_PATH} && cd ${PROD_PATH} && find public/js -type f -name '*.js' | sort" 2>/dev/null || true)"
if [ -z "${REMOTE_MODULES}" ]; then
    echo "x Module check FAILED: no compiled modules found in ${PROD_PATH}public/js/." >&2
    exit 1
fi

while IFS= read -r module; do
    [ -n "${module}" ] || continue
    url="${SITE_URL}/${module#public/}?deploy=${CACHE_BUST}"
    status="$(curl -sS -o /dev/null -w '%{http_code}' "${url}" 2>/dev/null || echo 000)"
    if [ "${status}" != "200" ]; then
        echo "x Module check FAILED: ${url} returned HTTP ${status} (expected 200)" >&2
        exit 1
    fi
done <<< "${REMOTE_MODULES}"
echo "OK All $(printf '%s\n' "${REMOTE_MODULES}" | wc -l | tr -d ' ') compiled modules are served"

REMOTE_SUM="$(ssh "${PROD_HOST}" "${REMOTE_PATH} && cd ${PROD_PATH} && cksum < public/js/main.js" 2>/dev/null | awk '{print $1}')"
SERVED_SUM="$(curl -sS "${SITE_URL}/js/main.js?deploy=${CACHE_BUST}" 2>/dev/null | cksum | awk '{print $1}')"
if [ -z "${REMOTE_SUM}" ] || [ -z "${SERVED_SUM}" ] || [ "${SERVED_SUM}" = "4294967295" ]; then
    echo "x Module check FAILED: could not compare ${SITE_URL}/js/main.js with the built file." >&2
    exit 1
fi
if [ "${REMOTE_SUM}" != "${SERVED_SUM}" ]; then
    echo "x Module check FAILED: the served main.js does not match the built file." >&2
    echo "  built:  ${REMOTE_SUM}" >&2
    echo "  served: ${SERVED_SUM}" >&2
    echo "  A cache or a stale deploy is serving an old module." >&2
    exit 1
fi
echo "OK Served main.js matches the built file"

echo ""
echo "✓ Deploy complete!"
