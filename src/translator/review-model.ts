/**
 * The shape of the proofreading API's answers, and the rules that keep a
 * malformed response from reaching the screen.
 *
 * Two endpoints feed the Analyse and Rewrite modes (see review-service.ts):
 *
 *   POST /v1/analyses
 *   {
 *     "language": "German",
 *     "explanation_language": "English",
 *     "text": "...",
 *     "checks": ["grammar", "spelling", "punctuation", "style"]
 *   }
 *   -> {
 *     "issues": [
 *       {
 *         "start": 34, "end": 46,
 *         "severity": "correction" | "suggestion",
 *         "category": "Word order",
 *         "original": "letzte Woche",
 *         "replacement": "letzte Woche",
 *         "sentence": "Ich bin nach Berlin gereist letzte Woche.",
 *         "corrected": "Ich bin letzte Woche nach Berlin gereist.",
 *         "explanation": "...",
 *         "tip": "...",
 *         "examples": [{ "correct": "...", "wrong": "..." }]
 *       }
 *     ],
 *     "corrected_text": "..."
 *   }
 *
 *   POST /v1/rewrites
 *   { "language": "German", "text": "...", "style": "formal" }
 *   -> {
 *     "rewrite": "...",
 *     "changes": [
 *       { "start": 120, "end": 132, "original": "sehr lecker",
 *         "replacement": "hervorragend", "note": "..." }
 *     ]
 *   }
 *
 * Offsets are UTF-16 code units into the exact text that was sent, which is
 * what JavaScript string indices use, so a span can be highlighted without a
 * second lookup. Everything here is pure data: no DOM, easy to reason about.
 */

export type Severity = 'correction' | 'suggestion';

/** The two modes that work on the learner's own text. */
export type ReviewMode = 'analyse' | 'rewrite';

export const CHECK_IDS = ['grammar', 'spelling', 'punctuation', 'style'] as const;
export type CheckId = (typeof CHECK_IDS)[number];

export const REWRITE_STYLES = ['formal', 'simple', 'playful'] as const;
export type RewriteStyle = (typeof REWRITE_STYLES)[number];

export interface ReviewExample {
	readonly correct: string;
	readonly wrong: string;
}

export interface ReviewIssue {
	/** Start of the highlighted span, in UTF-16 code units. */
	readonly start: number;
	/** End of the highlighted span, exclusive. */
	readonly end: number;
	readonly severity: Severity;
	readonly category: string;
	/** The learner's words for this span, from the API or the sent text. */
	readonly original: string;
	/** What to write instead, when the API can express it as a fragment. */
	readonly replacement: string | null;
	/** The sentence around the span, and its corrected version, if given. */
	readonly sentence: string | null;
	readonly corrected: string | null;
	readonly explanation: string;
	/** The rule to remember next time. */
	readonly tip: string | null;
	readonly examples: readonly ReviewExample[];
}

export interface AnalysisResult {
	readonly issues: readonly ReviewIssue[];
	/** The whole text with every correction applied, for copying aloud. */
	readonly correctedText: string | null;
}

export interface RewriteChange {
	readonly start: number;
	readonly end: number;
	readonly original: string | null;
	readonly replacement: string;
	readonly note: string | null;
}

export interface RewriteResult {
	readonly text: string;
	readonly changes: readonly RewriteChange[];
}

export function isCheckId(value: unknown): value is CheckId {
	return typeof value === 'string' && (CHECK_IDS as readonly string[]).includes(value);
}

export function isRewriteStyle(value: unknown): value is RewriteStyle {
	return typeof value === 'string' && (REWRITE_STYLES as readonly string[]).includes(value);
}

/* --------------------------------------------------------------------------
	Response parsing
	-------------------------------------------------------------------------- */

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? value as JsonObject
		: null;
}

function asString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function asText(value: unknown): string | null {
	const text = asString(value)?.trim() ?? '';
	return text === '' ? null : text;
}

function asInteger(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function clamp(value: number, max: number): number {
	return Math.max(0, Math.min(value, max));
}

/**
 * Reads one issue, clamping its span to the text it was measured against.
 * Anything without a usable span is dropped: a highlight the UI cannot place
 * is worse than no highlight.
 */
function parseIssue(value: unknown, text: string): ReviewIssue | null {
	const item = asObject(value);
	if (!item) return null;

	const start = asInteger(item['start']);
	const end = asInteger(item['end']);
	if (start === null || end === null) return null;

	const from = clamp(start, text.length);
	const to = clamp(end, text.length);
	if (to <= from) return null;

	const severity: Severity = item['severity'] === 'suggestion' ? 'suggestion' : 'correction';
	const original = asText(item['original']) ?? text.slice(from, to);

	return {
		start: from,
		end: to,
		severity,
		category: asText(item['category']) ?? 'This part',
		original,
		replacement: asText(item['replacement']),
		sentence: asText(item['sentence']),
		corrected: asText(item['corrected']),
		explanation: asString(item['explanation'])?.trim() ?? '',
		tip: asText(item['tip']),
		examples: parseExamples(item['examples'])
	};
}

function parseExamples(value: unknown): ReviewExample[] {
	if (!Array.isArray(value)) return [];
	const examples: ReviewExample[] = [];
	for (const entry of value) {
		const item = asObject(entry);
		if (!item) continue;
		const correct = asText(item['correct']);
		const wrong = asText(item['wrong']);
		if (correct && wrong) examples.push({ correct, wrong });
	}
	return examples;
}

/** Issues in reading order; the caller resolves overlaps when it renders. */
function byPosition<T extends { start: number; end: number }>(items: readonly T[]): T[] {
	return [...items].sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Parses an analysis response. Returns null when the payload is not an
 * analysis at all; an empty `issues` list is a valid "nothing to fix".
 */
export function parseAnalysis(payload: unknown, text: string): AnalysisResult | null {
	const body = asObject(payload);
	if (!body || !Array.isArray(body['issues'])) return null;

	const issues: ReviewIssue[] = [];
	for (const entry of body['issues']) {
		const issue = parseIssue(entry, text);
		if (issue) issues.push(issue);
	}

	const corrected = asString(body['corrected_text']);
	return {
		issues: byPosition(issues),
		correctedText: corrected !== null && corrected.trim() !== '' ? corrected : null
	};
}

function parseChange(value: unknown, length: number): RewriteChange | null {
	const item = asObject(value);
	if (!item) return null;

	const start = asInteger(item['start']);
	const end = asInteger(item['end']);
	if (start === null || end === null) return null;

	const from = clamp(start, length);
	const to = clamp(end, length);
	if (to <= from) return null;

	const replacement = asText(item['replacement']);
	if (replacement === null) return null;

	return {
		start: from,
		end: to,
		original: asText(item['original']),
		replacement,
		note: asText(item['note'])
	};
}

/**
 * Parses a rewrite response. The rewritten text is required; changes are
 * optional and only used to mark and describe what moved.
 */
export function parseRewrite(payload: unknown): RewriteResult | null {
	const body = asObject(payload);
	if (!body) return null;

	const text = asString(body['rewrite']);
	if (text === null || text.trim() === '') return null;

	const changes: RewriteChange[] = [];
	if (Array.isArray(body['changes'])) {
		for (const entry of body['changes']) {
			const change = parseChange(entry, text.length);
			if (change) changes.push(change);
		}
	}

	return { text, changes: byPosition(changes) };
}

/* --------------------------------------------------------------------------
	Presentation helpers
	-------------------------------------------------------------------------- */

/**
 * Drops issues whose spans overlap an earlier one, so the annotated text can
 * be built in a single pass. The API should send non-overlapping spans; this
 * is the belt to that pair of braces.
 */
export function renderableIssues(issues: readonly ReviewIssue[]): ReviewIssue[] {
	const result: ReviewIssue[] = [];
	let cursor = 0;
	for (const issue of byPosition(issues)) {
		if (issue.start < cursor) continue;
		result.push(issue);
		cursor = issue.end;
	}
	return result;
}

/** "2 corrections · 1 suggestion", or "Looks good" when there are none. */
export function analysisSummary(issues: readonly ReviewIssue[]): string {
	if (issues.length === 0) return 'Looks good';
	const corrections = issues.filter((issue) => issue.severity === 'correction').length;
	const suggestions = issues.length - corrections;
	const parts: string[] = [];
	if (corrections > 0) parts.push(`${corrections} correction${corrections === 1 ? '' : 's'}`);
	if (suggestions > 0) parts.push(`${suggestions} suggestion${suggestions === 1 ? '' : 's'}`);
	return parts.join(' · ');
}
