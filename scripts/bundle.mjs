#!/usr/bin/env node
/**
 * Concatenate compiled ES modules into one classic script.
 *
 *   node scripts/bundle.mjs <root> <entry> <output>
 *
 * The templates load a single non-module script, so every module has to end up
 * in one shared scope:
 *
 *   - relative imports are dropped, because the declarations they referred to
 *     are now siblings in the same IIFE;
 *   - "export class Foo" becomes "const Foo = class Foo", keeping the name for
 *     reflection and stack traces;
 *   - "export const/let/var/function" simply loses the keyword;
 *   - "export default ..." keeps its named binding;
 *   - re-export lists become one-line aliases ("const container = instance.");
 *
 * Aliases are emitted with the module that needs them, immediately after that
 * module's declarations and before anything that follows. They cannot wait
 * until the end of the bundle: "class Thing extends BaseClass" evaluates the
 * superclass as soon as the class is defined, so an alias declared after it
 * would be in the temporal dead zone.
 *
 * Modules are emitted in dependency order, starting from the entry and
 * following its imports depth-first: a const or class is hoisted but not
 * initialised, so a file that runs before the file declaring what it uses
 * would hit the temporal dead zone.
 *
 * The transforms are line-based, which is safe because tsc and the libraries'
 * own builds put each import and export on a single line. Blank lines and
 * comments are preserved so the output stays readable.
 *
 * This runs while deploying as well (build-server.sh), so it deliberately uses
 * nothing beyond plain Node: no dependencies, no build step of its own.
 */

import { readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SELF = new URL(import.meta.url).pathname;

function usage() {
	console.error('usage: bundle.mjs <root> <entry> <output>');
	process.exit(2);
}

/** Every .js file under `root`, as module names (path without the suffix). */
function listModules(root) {
	const found = [];

	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const full = join(directory, entry.name);
			if (entry.isDirectory()) {
				walk(full);
				continue;
			}
			if (!entry.name.endsWith('.js')) continue;
			const name = relative(root, full).split(sep).join('/');
			found.push({ name: name.replace(/\.js$/, ''), path: full });
		}
	};
	walk(root);
	return found;
}

/** The module an import or re-export line pulls in, or null. */
function importTarget(line) {
	if (!/^\s*(import|export)\s/.test(line)) return null;
	if (!/(^|[^A-Za-z0-9_$])from\s/.test(line) && !/^\s*import\s*["']/.test(line)) return null;
	const quoted = line.match(/["']([^"']+)["']/);
	return quoted ? quoted[1] : null;
}

/** "./foo.js" from "a/b.js" becomes "a/foo"; bare names resolve locally. */
function resolveModule(from, target, known) {
	const parts = (target.startsWith('.') ? from.replace(/[^/]*$/, '') + target : target).split('/');
	const out = [];
	for (const part of parts) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			out.pop();
			continue;
		}
		out.push(part);
	}
	let name = out.join('/').replace(/\.js$/, '');
	if (!known.has(name) && known.has(`${name}/index`)) name = `${name}/index`;
	return name;
}

const [root, entryArg, output] = process.argv.slice(2);
if (!root || !entryArg || !output) usage();

const entry = entryArg.replace(/\.js$/, '');
const modules = listModules(root);
if (modules.length === 0) {
	console.error(`bundle: no .js modules found in ${root}`);
	process.exit(1);
}

const pathOf = new Map(modules.map((module) => [module.name, module.path]));
const known = new Set(pathOf.keys());
if (!known.has(entry)) {
	console.error(`bundle: entry ${entry} was not found in ${root}`);
	process.exit(1);
}

const lines = new Map(modules.map((module) => [module.name, readFileSync(module.path, 'utf8').split(/\r?\n/)]));

/* Depth-first, dependencies first. */
const order = [];
const visited = new Set();
const collect = (name) => {
	if (visited.has(name)) return;
	visited.add(name);
	for (const line of lines.get(name)) {
		const target = importTarget(line);
		if (!target) continue;
		const dependency = resolveModule(name, target, known);
		if (known.has(dependency)) collect(dependency);
	}
	order.push(name);
};
collect(entry);

/** The identifier that follows a keyword on a declaration line. */
function wordAfter(line, keyword) {
	const rest = line.slice(line.indexOf(keyword) + keyword.length + 1);
	return rest.replace(/[^A-Za-z0-9_$].*$/, '');
}

/** "extends Bar {" or " {" — everything after a class name. */
function classTail(line) {
	return line.slice(line.indexOf('class') + 'class'.length).replace(/^\s*[A-Za-z0-9_$]+/, '');
}

const outputLines = [
	'/* Generated from src/ - edit the TypeScript, not this file. */',
	'(function () {',
	'"use strict";'
];

/** Declarations only: module syntax stripped, names preserved. */
function emitDeclarations(name) {
	for (const line of lines.get(name)) {
		if (/^\s*import\s/.test(line)) continue;
		if (/^\s*export\s*(\{|\*|$)/.test(line)) continue;

		if (/^\s*export default\s/.test(line)) {
			if (/^export default (function|class) [A-Za-z0-9_$]+/.test(line)) {
				const keyword = line.includes('function') ? 'function' : 'class';
				const local = wordAfter(line, keyword);
				outputLines.push(`const ${local} = ${line.slice('export default'.length + 1)}`);
			} else if (/^export default [A-Za-z0-9_$]+\s*;?\s*$/.test(line)) {
				/* "export default instance;" — the binding is already named. */
			} else {
				outputLines.push(line);
			}
			continue;
		}

		const classMatch = line.match(/^export (default )?class ([A-Za-z0-9_$]+)/);
		if (classMatch) {
			const local = classMatch[2];
			outputLines.push(`const ${local} = class ${local}${classTail(line)}`);
			continue;
		}

		if (/^export (var|const|let|function)\s/.test(line)) {
			outputLines.push(line.slice('export '.length));
			continue;
		}

		outputLines.push(line);
	}
}

/** The local name bound by a module's default export. */
function moduleDefault(name) {
	for (const line of lines.get(name)) {
		const named = line.match(/^export default (?:function|class) ([A-Za-z0-9_$]+)/);
		if (named) return named[1];
		const reference = line.match(/^export default ([A-Za-z0-9_$]+)\s*;?\s*$/);
		if (reference) return reference[1];
	}
	console.error(`bundle: ${name} has no single named default export`);
	return name.replace(/[^A-Za-z0-9_$].*$/, '');
}

/** Every alias already declared, so a name imported by several modules is
    only ever declared once. */
const declared = new Map();

/** Emits "const target = source" unless both names are the same. */
function declare(target, source) {
	if (!target || !source || target === source) return;
	if (declared.has(target)) return;
	declared.set(target, source);
	outputLines.push(`const ${target} = ${source};`);
}

/** Aliases other modules import by a different name, plus re-exports. */
function emitAliases(name) {
	for (const line of lines.get(name)) {
		const target = importTarget(line);

		const imported = line.match(/^\s*import\s*\{([^}]*)\}/);
		if (imported && target !== null) {
			const dependency = resolveModule(name, target, known);
			if (!known.has(dependency)) continue;
			for (const item of imported[1].split(',')) {
				const [local, alias] = item.trim().replace(/\btype /g, '').split(/\s+as\s+/);
				if (alias) declare(alias, local);
			}
			continue;
		}

		const exported = line.match(/^\s*export\s*\{([^}]*)\}(?:\s*from\s*["'][^"']+["'])?/);
		if (!exported) continue;

		/* "export { default as L } from "./m"" → the module's default binding. */
		if (/\bdefault\s+as\s+/.test(exported[1]) && target !== null) {
			const alias = exported[1].split(/\bdefault\s+as\s+/)[1].replace(/[^A-Za-z0-9_$].*$/, '');
			declare(alias, moduleDefault(resolveModule(name, target, known)));
		}

		for (const item of exported[1].split(',')) {
			const [local, alias] = item.trim().replace(/\btype /g, '').split(/\s+as\s+/);
			if (!local || local === 'default') continue;
			declare(alias || local, local);
		}
	}
}

for (const name of order) {
	outputLines.push(`// ---------- ${name} ----------`);
	/* Aliases first: in a real module the imports are bound before the
	   module body runs, so a class may extend an aliased import. */
	emitAliases(name);
	emitDeclarations(name);
	outputLines.push('');
}

outputLines.push('}());');

const temporary = `${output}.tmp`;
try {
	writeFileSync(temporary, `${outputLines.join('\n')}\n`);
	statSync(temporary);
	renameSync(temporary, output);
} catch (error) {
	rmSync(temporary, { force: true });
	console.error(`bundle: could not write ${output}: ${error.message}`);
	process.exit(1);
}
