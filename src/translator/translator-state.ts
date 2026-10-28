/**
 * The translator's state and the rules that keep it sensible.
 *
 * Pure data and pure functions: no DOM, so the rules (keep the pair distinct,
 * remember recent languages) can be reasoned about and tested on their own.
 */

import { AUTO_CODE, isLanguageCode, isStyle, type LanguageCode, type Side } from './languages.js';

export interface RecentLanguages {
	source: LanguageCode[];
	target: LanguageCode[];
}

export interface TranslatorState {
	source: LanguageCode;
	target: LanguageCode;
	style: string | null;
	recent: RecentLanguages;
	/** The box currently holds the sample text rather than the visitor's own. */
	dataDefault: boolean;
}

const DEFAULT_RECENT: readonly LanguageCode[] = ['en', 'de', 'mi'];
const MAX_RECENT = 6;

export function createDefaultState(): TranslatorState {
	return {
		source: 'en',
		target: 'de',
		style: null,
		recent: {
			source: [...DEFAULT_RECENT],
			target: [...DEFAULT_RECENT]
		},
		dataDefault: true
	};
}

/** Moves `code` to the front of the side's recent list, capped at six. */
export function noteUse(state: TranslatorState, side: Side, code: LanguageCode): void {
	const list = state.recent[side];
	const at = list.indexOf(code);
	if (at !== -1) list.splice(at, 1);
	list.unshift(code);
	if (list.length > MAX_RECENT) list.length = MAX_RECENT;
}

/**
 * Picks a language for one side, keeping the pair distinct Google-style: if
 * the chosen language is already in use on the other side, the other side
 * takes over whatever this side held before (falling back to an English /
 * German pair when that was "Detect language").
 */
export function applySelection(state: TranslatorState, side: Side, code: LanguageCode): boolean {
	if (!isLanguageCode(code)) return false;
	if (side === 'target' && code === AUTO_CODE) return false;

	const other: Side = side === 'source' ? 'target' : 'source';
	if (code !== state[side] && code === state[other]) {
		const hand = state[side];
		state[other] = hand === AUTO_CODE || hand === code
			? (code === 'en' ? 'de' : 'en')
			: hand;
	}
	state[side] = code;
	noteUse(state, side, code);
	return true;
}

/**
 * Swaps the pair. "Detect language" has no real detector here, so it stands
 * in as English when it moves to the target side.
 */
export function swapPair(state: TranslatorState): void {
	const source = state.source === AUTO_CODE ? 'en' : state.source;
	state.source = state.target;
	state.target = source;
	noteUse(state, 'source', state.source);
	noteUse(state, 'target', state.target);
}

export function isSide(value: string | null | undefined): value is Side {
	return value === 'source' || value === 'target';
}

export function sanitizeRecent(value: unknown): LanguageCode[] | null {
	if (!Array.isArray(value)) return null;
	const seen = new Set<LanguageCode>();
	for (const code of value) {
		if (isLanguageCode(code)) seen.add(code);
	}
	return [...seen].slice(0, MAX_RECENT);
}

export { isStyle };
