#!/bin/bash
#
# Compile the TypeScript in src/ into the browser script the templates load,
# public/scripts.js.
#
# Development machines run this. It needs Node.js, npm and a C toolchain
# (bundled versions of npm need gcc for their native dependencies):
#   sudo apt-get install -y nodejs npm build-essential
#
# Usage:
#   ./build.sh            Type-check, compile and bundle
#   ./build.sh --check    Type-check only, no output
#
# npm dependencies are installed automatically when they are missing or
# package.json is newer than the installed copy.
#
# Servers without Node.js use build-server.sh, which runs the same compiler
# and the same bundler (scripts/bundle.mjs) and so produces the same output.

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
        -h|--help) sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown argument: ${arg}" >&2; exit 2 ;;
    esac
done

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "x Node.js and npm are required to compile src/." >&2
    echo "  Install them with: sudo apt-get install -y nodejs npm build-essential" >&2
    echo "  Hosts without Node.js can use build-server.sh, which needs only tsc." >&2
    exit 1
fi

install_deps() {
    echo "Installing npm dependencies..."
    if ! npm install --no-audit --no-fund; then
        echo "x npm install failed. A native dependency needs a C toolchain:" >&2
        echo "  sudo apt-get install -y build-essential" >&2
        exit 1
    fi
}

if [ ! -f node_modules/typescript/package.json ]; then
    install_deps
elif [ package.json -nt node_modules/typescript/package.json ]; then
    install_deps
fi

TSC=("${ROOT}/node_modules/.bin/tsc")
if [ ! -x "${TSC[0]}" ]; then
    TSC=(node "${ROOT}/node_modules/typescript/bin/tsc")
fi

echo "Type-checking ${SRC_DIR}/..."
"${TSC[@]}" --noEmit

if [ "${CHECK_ONLY}" -eq 1 ]; then
    echo "✓ Types are clean."
    exit 0
fi

echo "Compiling ${SRC_DIR}/ to ${OUT_DIR}/..."
rm -rf "${OUT_DIR}"
"${TSC[@]}" --project tsconfig.json

# The libraries (tsyringe, reflect-metadata) change only when they are upgraded,
# so their bundle is built once and left alone after that. It is rebuilt when a
# source of it is newer, or when the existing copy does not parse — the latter
# catches a vendor.js left behind by an older toolchain, whose timestamps can
# look up to date while the file is actually broken.
if [ ! -f public/vendor.js ] || [ package-lock.json -nt public/vendor.js ] ||
    [ scripts/bundle.mjs -nt public/vendor.js ] || [ scripts/build-vendor.sh -nt public/vendor.js ] ||
    ! node --check public/vendor.js >/dev/null 2>&1; then
    echo "Building public/vendor.js..."
    "${ROOT}/scripts/build-vendor.sh"
fi

echo "Bundling ${OUT_DIR}/${ENTRY} to ${BUNDLE}..."
node "${ROOT}/scripts/bundle.mjs" "${OUT_DIR}" "${ENTRY}" "${BUNDLE}"

# Never ship a bundle that does not parse.
if ! node --check "${BUNDLE}"; then
    rm -f "${BUNDLE}"
    echo "x The bundled script does not parse; public/scripts.js was removed." >&2
    exit 1
fi

echo "✓ Built ${BUNDLE} ($(wc -c < "${BUNDLE}") bytes)"
