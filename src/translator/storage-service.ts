/**
 * Saving and restoring the translator between visits.
 *
 * Anything unrecognised in the stored blob (an old format, a hand-edited
 * value, a language code we no longer know) is dropped rather than trusted.
 */

import { isLanguageCode, isStyle, type Side } from './languages.js';
import { readStorage, storedString, writeStorage } from '../ui/dom.js';
import { sanitizeRecent, type TranslatorState } from './translator-state.js';

const SESSION_STORE_KEY = 'translate-state';

export interface PersistedText {
	input: string | null;
	output: string | null;
}

function parseStored(raw: string | null): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
	} catch {
		return null;
	}
}

export interface SessionSnapshot {
	readonly input: string;
	readonly output: string;
}

export class StorageService {
	private readonly storage: Storage;

	constructor(storage: Storage = window.localStorage) {
		this.storage = storage;
	}

	/** Writes the language choices and the current text in one record. */
	save(state: TranslatorState, session: SessionSnapshot): void {
		writeStorage(this.storage, SESSION_STORE_KEY, JSON.stringify({
			source: state.source,
			target: state.target,
			style: state.style,
			recent: state.recent,
			input: session.input,
			output: session.output
		}));
	}

	/**
	 * Applies the stored language choices and recent lists to `state`, and
	 * returns the stored text, if any, for the caller to place in the DOM.
	 */
	restore(state: TranslatorState): PersistedText {
		const saved = parseStored(readStorage(this.storage, SESSION_STORE_KEY));
		if (!saved) return { input: null, output: null };

		const source = saved['source'];
		if (isLanguageCode(source)) state.source = source;

		const target = saved['target'];
		if (isLanguageCode(target) && target !== 'auto') state.target = target;

		const style = saved['style'];
		if (isStyle(style)) state.style = style;

		const recent = saved['recent'];
		if (recent !== null && typeof recent === 'object') {
			(['source', 'target'] as const).forEach((side: Side) => {
				const list = sanitizeRecent((recent as Record<string, unknown>)[side]);
				if (list) state.recent[side] = list;
			});
		}

		return {
			input: storedString(saved, 'input'),
			output: storedString(saved, 'output')
		};
	}
}
