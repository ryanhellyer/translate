#!/bin/bash
#
# Compile src/ into public/scripts.js on the server, from the working tree that
# deploy.sh has just rsynced.
#
# deploy.sh runs this after the upload, so the bundle the web server serves is
# always built from the source that was deployed - a developer forgetting to
# run build.sh can no longer ship a stale scripts.js.
#
# Requirements on the server: Node.js and a TypeScript compiler. npm install is
# not run there; the compiler is found in this order:
#   1. $TSC, if set (e.g. TSC=~/bin/tsc)
#   2. ./node_modules/.bin/tsc (a copy from a development machine)
#   3. tsc on $PATH
#   4. npx, which fetches typescript@^7 on first use
#
# The runtime libraries are not recompiled here: public/vendor.js ships with
# the tree and changes only when the libraries are upgraded.
#
# Usage:
#   ./build-server.sh            Compile and bundle
#   ./build-server.sh --check    Type-check only, no output

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

SRC_DIR="src"
OUT_DIR="dist"
ENTRY="main.js"
BUNDLE="public/scripts.js"

CHECK_ONLY=0
for arg in "$@"; do
    case "${arg}" in
        --check) CHECK_ONLY=1 ;;
        -h|--help) sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown argument: ${arg}" >&2; exit 2 ;;
    esac
done

if ! command -v node >/dev/null 2>&1; then
    echo "x Node.js is required to compile and bundle src/ on $(hostname)." >&2
    echo "  Install it with: sudo apt-get install -y nodejs" >&2
    exit 1
fi

find_tsc() {
    if [ -n "${TSC:-}" ] && [ -x "${TSC}" ]; then
        echo "${TSC}"; return
    fi
    for candidate in \
        "${ROOT}/node_modules/typescript/bin/tsc" \
        "${ROOT}/node_modules/.bin/tsc"; do
        if [ -f "${candidate}" ]; then
            echo "${candidate}"; return
        fi
    done
    if command -v tsc >/dev/null 2>&1; then
        echo "$(command -v tsc)"; return
    fi
    if command -v npx >/dev/null 2>&1; then
        echo "npx --yes --package typescript@^7 tsc"; return
    fi
    echo ""
}

TSC_CMD="$(find_tsc)"
if [ -z "${TSC_CMD}" ]; then
    echo "x No TypeScript compiler found on $(hostname)." >&2
    echo "  Install one with: npm install -g typescript" >&2
    echo "  ...or copy node_modules/ from a development machine." >&2
    exit 1
fi

run_tsc() {
    # A tsc on PATH may be a shell shim; prefer node when the compiler is the
    # copy in node_modules so it runs whatever its shebang says.
    if [ "${TSC_CMD}" = "${ROOT}/node_modules/typescript/bin/tsc" ]; then
        node "${TSC_CMD}" "$@"
    else
        # shellcheck disable=SC2086
        ${TSC_CMD} "$@"
    fi
}

echo "Type-checking ${SRC_DIR}/..."
run_tsc --noEmit

if [ "${CHECK_ONLY}" -eq 1 ]; then
    echo "✓ Types are clean."
    exit 0
fi

for dependency in tsyringe reflect-metadata; do
    if [ ! -d "${ROOT}/node_modules/${dependency}" ]; then
        echo "x node_modules/${dependency} is missing, so src/ cannot be compiled." >&2
        echo "  Run npm install on a development machine, then deploy the tree again." >&2
        exit 1
    fi
done

if [ ! -f public/vendor.js ]; then
    echo "x public/vendor.js is missing: it holds tsyringe and reflect-metadata." >&2
    echo "  Run ./build.sh on a development machine, then deploy the tree again." >&2
    exit 1
fi

# vendor.js is built on the development machine (it needs npm), so the server
# only receives it. Check it parses before going further: a stale copy used to
# ship silently and take the whole page down with a SyntaxError that looked
# like an unrelated app bug.
if ! node --check public/vendor.js; then
    echo "x public/vendor.js does not parse. It was built by an older toolchain." >&2
    echo "  Rebuild it with ./scripts/build-vendor.sh on a development machine and" >&2
    echo "  deploy the tree again." >&2
    exit 1
fi

echo "Compiling ${SRC_DIR}/ to ${OUT_DIR}/..."
rm -rf "${OUT_DIR}"
run_tsc --project tsconfig.json

echo "Bundling ${OUT_DIR}/${ENTRY} to ${BUNDLE}..."
node "${ROOT}/scripts/bundle.mjs" "${OUT_DIR}" "${ENTRY}" "${BUNDLE}"

# Never leave a bundle that does not parse in place.
if ! node --check "${BUNDLE}"; then
    echo "x The bundled script does not parse; ${BUNDLE} was not replaced." >&2
    exit 1
fi

echo "✓ Built ${BUNDLE} ($(wc -c < "${BUNDLE}") bytes)"
