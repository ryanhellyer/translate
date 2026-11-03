/**
 * Small, typed helpers for the bits of DOM work that appear more than once.
 * Everything fails loudly during start-up: a missing element means the markup
 * and the script have drifted apart, which is a bug worth seeing immediately.
 */

export type ThemeName = 'light' | 'dark';

export function requireElement<T extends Element>(selector: string, root: ParentNode = document): T {
	const element = root.querySelector<T>(selector);
	if (!element) {
		throw new Error(`Expected an element matching "${selector}"`);
	}
	return element;
}

export function requireElementById<T extends HTMLElement = HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Expected an element with id "${id}"`);
	}
	return element as T;
}

export function optionalElement<T extends Element>(selector: string): T | null {
	return document.querySelector<T>(selector);
}

/**
 * Reads a value out of localStorage, treating a blocked store (private mode,
 * denied cookies) as "nothing stored" rather than an error.
 */
export function readStorage(storage: Storage, key: string): string | null {
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

export function writeStorage(storage: Storage, key: string, value: string): void {
	try {
		storage.setItem(key, value);
	} catch {
		/* Storage is a convenience; losing it must never break the page. */
	}
}

/** Returns the key only when the stored value is a plain non-empty string. */
export function storedString(source: Record<string, unknown> | null, key: string): string | null {
	if (!source) return null;
	const value = source[key];
	return typeof value === 'string' ? value : null;
}
