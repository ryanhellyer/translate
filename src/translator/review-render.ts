/**
 * Turns the API's data into DOM for the proofreading modes.
 *
 * Everything that came from the API or the visitor is written with
 * `textContent` — never `innerHTML` — so a sentence containing angle brackets
 * cannot become markup. The only innerHTML here is a fixed icon string.
 */

import type {
	RewriteChange,
	ReviewExample,
	ReviewIssue
} from './review-model.js';

const ICON_TIP =
	'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2Z"></path></svg>';

const ICON_POINTER =
	'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg>';

const ICON_CHECK_CIRCLE =
	'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.5 2.5 4.5-5"></path></svg>';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * The learner's text with each issue wrapped in a button. Issues arrive in
 * reading order and are already free of overlaps (see renderableIssues).
 */
export function buildAnnotated(text: string, issues: readonly ReviewIssue[]): DocumentFragment {
	const fragment = document.createDocumentFragment();
	let cursor = 0;

	issues.forEach((issue, index) => {
		if (issue.start > cursor) fragment.append(text.slice(cursor, issue.start));

		const flag = document.createElement('button');
		flag.type = 'button';
		flag.className = 'review-flag' + (issue.severity === 'suggestion' ? ' is-suggestion' : '');
		flag.dataset['issue'] = String(index + 1);
		flag.setAttribute('aria-controls', `insight-${index + 1}`);
		flag.setAttribute('aria-expanded', 'false');
		flag.title = `${issue.category} — click for the explanation`;
		flag.textContent = text.slice(issue.start, issue.end);
		fragment.append(flag);

		cursor = issue.end;
	});

	if (cursor < text.length) fragment.append(text.slice(cursor));
	return fragment;
}

/** A sentence with one fragment marked, or plain text when it is not found. */
function sentenceWithMark(sentence: string, fragment: string | null, className: string): DocumentFragment {
	const node = document.createDocumentFragment();
	const at = fragment === null ? -1 : sentence.indexOf(fragment);
	if (fragment === null || at === -1) {
		node.append(sentence);
		return node;
	}

	if (at > 0) node.append(sentence.slice(0, at));
	const mark = document.createElement('mark');
	mark.className = className;
	mark.textContent = fragment;
	node.append(mark);
	const after = at + fragment.length;
	if (after < sentence.length) node.append(sentence.slice(after));
	return node;
}

function buildFix(issue: ReviewIssue): HTMLElement | null {
	const rows: Array<[string, DocumentFragment]> = [];

	if (issue.sentence !== null) {
		rows.push(['You wrote', sentenceWithMark(issue.sentence, issue.original, 'wrong')]);
	} else if (issue.original !== '') {
		const node = document.createDocumentFragment();
		const mark = document.createElement('mark');
		mark.className = 'wrong';
		mark.textContent = issue.original;
		node.append(mark);
		rows.push(['You wrote', node]);
	}

	if (issue.corrected !== null) {
		rows.push([
			issue.severity === 'suggestion' ? 'More natural' : 'Say it like this',
			sentenceWithMark(issue.corrected, issue.replacement, 'right')
		]);
	} else if (issue.replacement !== null) {
		const node = document.createDocumentFragment();
		const mark = document.createElement('mark');
		mark.className = 'right';
		mark.textContent = issue.replacement;
		node.append(mark);
		rows.push([issue.severity === 'suggestion' ? 'More natural' : 'Say it like this', node]);
	}

	if (rows.length === 0) return null;

	const fix = element('dl', 'fix');
	for (const [label, value] of rows) {
		fix.append(element('dt', '', label));
		const dd = document.createElement('dd');
		dd.append(value);
		fix.append(dd);
	}
	return fix;
}

function buildExamples(examples: readonly ReviewExample[]): HTMLElement {
	const rows = element('div', 'examples');
	for (const example of examples) {
		const row = element('p', 'example');
		row.append(element('span', 'tick', '✓'));
		row.append(element('span', 'example-text', example.correct));
		row.append(element('span', 'cross', '✗'));
		row.append(element('span', 'example-text', example.wrong));
		rows.append(row);
	}
	return rows;
}

/** One explanation card, hidden until its highlight is selected. */
export function buildInsight(issue: ReviewIssue, index: number): HTMLElement {
	const card = element('article', 'insight');
	card.id = `insight-${index + 1}`;
	card.dataset['issue'] = String(index + 1);
	card.hidden = true;

	const kind = element('p', 'insight-kind');
	kind.append(element(
		'span',
		'sev ' + (issue.severity === 'suggestion' ? 'sev-suggestion' : 'sev-correction'),
		issue.severity === 'suggestion' ? 'Suggestion' : 'Correction'
	));
	kind.append(element('span', 'cat', issue.category));
	card.append(kind);

	const fix = buildFix(issue);
	if (fix) card.append(fix);

	if (issue.explanation !== '') {
		const explain = element('p', 'explain');
		const lead = element('strong', '', issue.severity === 'suggestion'
			? 'Why it reads oddly. '
			: 'What went wrong. ');
		explain.append(lead, issue.explanation);
		card.append(explain);
	}

	if (issue.tip !== null) {
		const remember = element('div', 'remember');
		const title = element('p', 'remember-title');
		title.innerHTML = ICON_TIP;
		title.append('How to remember');
		remember.append(title, element('p', '', issue.tip));
		card.append(remember);
	}

	if (issue.examples.length > 0) card.append(buildExamples(issue.examples));
	return card;
}

/** The rewritten text, with each change marked. */
export function buildRewrite(text: string, changes: readonly RewriteChange[]): DocumentFragment {
	const fragment = document.createDocumentFragment();
	let cursor = 0;

	for (const change of changes) {
		if (change.start < cursor) continue;
		if (change.start > cursor) fragment.append(text.slice(cursor, change.start));
		const mark = document.createElement('mark');
		mark.className = 'change';
		mark.textContent = text.slice(change.start, change.end);
		fragment.append(mark);
		cursor = change.end;
	}

	if (cursor < text.length) fragment.append(text.slice(cursor));
	return fragment;
}

/** The "What changed" list. */
export function buildChangeList(changes: readonly RewriteChange[]): DocumentFragment {
	const fragment = document.createDocumentFragment();

	for (const change of changes) {
		const row = document.createElement('li');
		const pair = element('strong', '');
		if (change.original !== null && change.original !== change.replacement) {
			pair.textContent = `${change.original} → ${change.replacement}`;
		} else {
			pair.textContent = change.replacement;
		}
		row.append(pair);
		if (change.note !== null) row.append(' ' + change.note);
		fragment.append(row);
	}

	return fragment;
}

/**
 * The empty or "pick a highlight" card in the insight area.
 * `message` is the emphasised sentence; `detail` the quiet one below it.
 */
export function buildPrompt(message: string, detail: string | null, icon: 'pointer' | 'done' | null = 'pointer'): HTMLElement {
	const prompt = element('div', 'review-prompt');
	if (icon !== null) {
		const mark = element('span', 'review-prompt-icon');
		mark.innerHTML = icon === 'done' ? ICON_CHECK_CIRCLE : ICON_POINTER;
		prompt.append(mark);
	}
	const copy = element('p', 'review-prompt-copy');
	copy.append(element('strong', '', message));
	if (detail !== null) copy.append(' ' + detail);
	prompt.append(copy);
	return prompt;
}
