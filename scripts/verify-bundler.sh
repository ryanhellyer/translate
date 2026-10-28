#!/bin/bash
#
# Checks that the bundler turns a set of ES modules into a working
# classic script: every exported name resolves, exports are aliased correctly,
# and class names survive.
#
# Run it after changing the bundler (scripts/bundle.mjs). It needs node but no
# browser.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT

mkdir -p "${STAGE}/src"

cat > "${STAGE}/src/base.js" <<'JS'
export class Base {
    constructor() { this.kind = "base"; }
}
JS

cat > "${STAGE}/src/poly.js" <<'JS'
export class Base {
    constructor() { super(); }
}
JS

cat > "${STAGE}/src/helpers.js" <<'JS'
export function helper(value) {
    return value * 2;
}
export default function named(value) {
    return value + 1;
}
JS

cat > "${STAGE}/src/thing.js" <<'JS'
import { helper } from "./helpers";
import { Base as BaseClass } from "./base";

export default class Thing extends BaseClass {
    run(value) { return helper(value); }
}

export const kind = "thing";
JS

cat > "${STAGE}/src/reexports.js" <<'JS'
export { default as thingFactory } from "./thing";
export { helper } from "./helpers";
export { Base as ReBase } from "./base";
JS

cat > "${STAGE}/src/main.js" <<'JS'
import { helper } from "./helpers";
import { thingFactory, ReBase } from "./reexports";
import Thing from "./thing";

export function main(probe) {
    probe.helper = helper(2);
    probe.thingName = Thing.name;
    probe.thingRun = new thingFactory().run(3);
    probe.reBase = new ReBase().kind;
    probe.thingFactoryName = thingFactory.name;
}
JS

node "${ROOT}/scripts/bundle.mjs" "${STAGE}/src" "main.js" "${STAGE}/out.js"

node --check "${STAGE}/out.js"

node - "${STAGE}/out.js" <<'JS'
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync(process.argv[2], "utf8");

// The bundle is self-contained, so expose one entry point to the fixture.
const marker = "}());";
const index = source.lastIndexOf(marker);
if (index === -1) {
	console.error("FAIL bundle has no closing IIFE");
	process.exit(1);
}
const instrumented = source.slice(0, index) + "; globalThis.__main = main;\n" + marker + source.slice(index + marker.length);

const context = vm.createContext({});
vm.runInContext(instrumented, context);

const probe = {};
context.__main(probe);
const expected = {
	helper: 4,
	thingName: "Thing",
	thingRun: 6,
	reBase: "base",
	thingFactoryName: "Thing",
};
for (const [key, value] of Object.entries(expected)) {
	if (probe[key] !== value) {
		console.error(`FAIL ${key}: expected ${value}, got ${probe[key]}`);
		process.exit(1);
	}
}
console.log("✓ bundler fixture passed");
JS
