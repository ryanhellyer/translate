/**
 * Search over the language catalogue: builds one searchable string per
 * language (English name, native name and common exonyms) and answers
 * "which languages match this query?".
 */

import { AUTO_CODE, LANGS, language, normalize, type Language, type LanguageCode, type Side } from './languages.js';

export class LanguageCatalog {
	private readonly index = new Map<LanguageCode, string>();

	/** Language codes matching `query`, sorted by English name. */
	codesFor(side: Side, query = ''): LanguageCode[] {
		const needle = normalize(query);
		const matches = (code: LanguageCode): boolean =>
			!needle || this.searchIndex(code).includes(needle);

		const codes = Object.keys(LANGS)
			.filter((code) => code !== AUTO_CODE && matches(code))
			.sort((a, b) => language(a).name.localeCompare(language(b).name));

		/* Only the source side may auto-detect. */
		if (side === 'source' && matches(AUTO_CODE)) {
			codes.unshift(AUTO_CODE);
		}
		return codes;
	}

	language(code: LanguageCode): Language {
		return language(code);
	}

	private searchIndex(code: LanguageCode): string {
		const cached = this.index.get(code);
		if (cached !== undefined) return cached;

		const entry = language(code);
		const haystack = normalize([entry.name, entry.native, ...entry.search].join(' '));
		this.index.set(code, haystack);
		return haystack;
	}
}
