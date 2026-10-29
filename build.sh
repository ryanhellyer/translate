#!/bin/bash
#
# Compile the TypeScript in src/ into the browser modules the templates load.
#
#   src/**/*.ts  ->  public/js/**/*.js  (native ES modules)
#
# The same script runs locally and on any machine that needs to build the
# modules. It finds a TypeScript compiler in this order:
#
#   1. $TSC, if set
#   2. ./node_modules/.bin/tsc (or node_modules/typescript/bin/tsc)
#   3. tsc on $PATH
#   4. npx, which fetches TypeScript on first use
#
# Locally, missing dependencies are installed automatically. Pass --no-install
# to use only a compiler that is already available.
#
# Usage:
#   ./build.sh              Install dependencies if needed, then compile
#   ./build.sh --check      Type-check only, no output
#   ./build.sh --no-install Use an existing compiler only
#   ./build.sh --help       Show this help
#
# Requirements: Node.js. Local builds also use npm; servers can use a global
# tsc or npx instead.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

OUT_DIR="public/js"
ENTRY="${OUT_DIR}/main.js"
# tsc gets this as a *relative* --outDir. On some hosts the compiler is reached
# through a wrapper (a container, a remote builder) that mounts the project at
# a different absolute path, so an absolute $HOME/... path can point at nothing
# inside that sandbox: tsc then emits nowhere and still exits 0. Relative to the
# project root, the path is the same wherever the compiler thinks it is.
TMP_DIR_NAME=".build/js"
TMP_DIR="${ROOT}/${TMP_DIR_NAME}"
TSC_PACKAGE="typescript@7"

CHECK_ONLY=0
INSTALL=1

for arg in "$@"; do
    case "${arg}" in
        --check) CHECK_ONLY=1 ;;
        --no-install) INSTALL=0 ;;
        -h|--help) sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown argument: ${arg}" >&2; exit 2 ;;
    esac
done

if ! command -v node >/dev/null 2>&1; then
    echo "x Node.js is required to compile src/." >&2
    echo "  Install it, then run ./build.sh again." >&2
    exit 1
fi

TSC_CMD=()

find_tsc() {
    if [ -n "${TSC:-}" ]; then
        if [ -x "${TSC}" ]; then
            TSC_CMD=("${TSC}")
            return 0
        fi
        if [ -f "${TSC}" ]; then
            TSC_CMD=("node" "${TSC}")
            return 0
        fi
    fi

    if [ -x "${ROOT}/node_modules/.bin/tsc" ]; then
        TSC_CMD=("${ROOT}/node_modules/.bin/tsc")
        return 0
    fi

    if [ -f "${ROOT}/node_modules/typescript/bin/tsc" ]; then
        TSC_CMD=("node" "${ROOT}/node_modules/typescript/bin/tsc")
        return 0
    fi

    if command -v tsc >/dev/null 2>&1; then
        TSC_CMD=("$(command -v tsc)")
        return 0
    fi

    if command -v npx >/dev/null 2>&1; then
        TSC_CMD=("npx" "--yes" "--package" "${TSC_PACKAGE}" "tsc")
        return 0
    fi

    return 1
}

install_deps() {
    if ! command -v npm >/dev/null 2>&1; then
        return 1
    fi

    echo "Installing development dependencies..."
    if [ -f package-lock.json ]; then
        npm ci --no-audit --no-fund
    else
        npm install --no-audit --no-fund
    fi
}

if ! find_tsc; then
    if [ "${INSTALL}" -eq 1 ]; then
        if ! install_deps; then
            echo "" >&2
            echo "x npm is not available and no TypeScript compiler was found." >&2
            echo "  Install Node.js and npm, or provide a compiler with TSC=/path/to/tsc." >&2
            exit 1
        fi
        if ! find_tsc; then
            echo "x TypeScript was installed but tsc could not be found." >&2
            exit 1
        fi
    else
        echo "" >&2
        echo "x No TypeScript compiler found." >&2
        echo "  Install one with: npm install -g typescript" >&2
        echo "  ...or set TSC=/path/to/tsc." >&2
        exit 1
    fi
fi

echo "Type-checking src/..."
"${TSC_CMD[@]}" --noEmit --project tsconfig.json

if [ "${CHECK_ONLY}" -eq 1 ]; then
    echo "✓ Types are clean."
    exit 0
fi

cleanup() {
    rm -rf "${TMP_DIR}"
    rmdir "$(dirname "${TMP_DIR}")" 2>/dev/null || true
}
trap cleanup EXIT

# Compile into a temporary directory first. A failed build must not leave the
# site with a half-written or missing public/js/ directory.
rm -rf "${TMP_DIR}"
echo "Compiling src/ to ${OUT_DIR}/..."
"${TSC_CMD[@]}" --project tsconfig.json --outDir "${TMP_DIR_NAME}"

if [ ! -f "${TMP_DIR}/main.js" ]; then
    echo "x Compilation finished but ${TMP_DIR}/main.js is missing." >&2
    exit 1
fi

# Never publish a module that does not parse as an ES module.
while IFS= read -r -d '' module; do
    if ! node --input-type=module --check < "${module}"; then
        echo "x ${module} does not parse as an ES module." >&2
        exit 1
    fi
done < <(find "${TMP_DIR}" -type f -name '*.js' -print0)

rm -rf "${OUT_DIR}"
mv "${TMP_DIR}" "${OUT_DIR}"

MODULE_COUNT="$(find "${OUT_DIR}" -type f -name '*.js' | wc -l)"
echo "✓ Built ${ENTRY} and $((MODULE_COUNT - 1)) imported modules (${MODULE_COUNT} files total)"
