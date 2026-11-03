/**
 * The proofreading engine: calls to the AI API for Analyse and Rewrite.
 *
 * The endpoints are new and not live yet, so this is the contract the app
 * expects (documented in README.md too):
 *
 *   POST {base}/v1/analyses
 *   { "language": "German", "explanation_language": "English",
 *     "text": "...", "checks": ["grammar", "spelling", "punctuation", "style"] }
 *   -> { "issues": [...], "corrected_text": "..." }
 *
 *   POST {base}/v1/rewrites
 *   { "language": "German", "text": "...", "style": "formal" }
 *   -> { "rewrite": "...", "changes": [...] }
 *
 * Languages are the English names the catalogue already uses, exactly like
 * /v1/translations. The response shapes live in review-model.ts, which also
 * validates them; this class only moves bytes and turns failures into
 * messages the UI can show.
 */

import { apiName, type LanguageCode } from './languages.js';
import {
	parseAnalysis,
	parseRewrite,
	type AnalysisResult,
	type CheckId,
	type RewriteResult,
	type RewriteStyle
} from './review-model.js';
import { DEFAULT_API_BASE } from './translation-service.js';

export interface AnalysisRequest {
	/** The language the learner is writing in. */
	readonly language: LanguageCode;
	/** The language the explanation should be written in. */
	readonly explanationLanguage: LanguageCode;
	readonly text: string;
	readonly checks: readonly CheckId[];
}

export interface RewriteRequest {
	readonly language: LanguageCode;
	readonly text: string;
	/** Null means "sound natural"; the API default. */
	readonly style: RewriteStyle | null;
}

/** A failure the UI can show without leaking a stack trace. */
export class ReviewError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewError';
	}
}

export class ReviewService {
	private readonly base: string;

	constructor(base: string = DEFAULT_API_BASE) {
		this.base = base.replace(/\/+$/, '');
	}

	/** Checks `request.text` and resolves with the issues it found. */
	async analyse(request: AnalysisRequest, signal?: AbortSignal): Promise<AnalysisResult> {
		const body: Record<string, unknown> = {
			language: apiName(request.language),
			explanation_language: apiName(request.explanationLanguage),
			text: request.text,
			checks: [...request.checks]
		};

		const payload = await this.post('/v1/analyses', body, signal, 'checking');
		const result = parseAnalysis(payload, request.text);
		if (!result) {
			throw new ReviewError('The checking service returned an unexpected response.');
		}
		return result;
	}

	/** Rewrites `request.text` and resolves with the improved version. */
	async rewrite(request: RewriteRequest, signal?: AbortSignal): Promise<RewriteResult> {
		const body: Record<string, unknown> = {
			language: apiName(request.language),
			text: request.text
		};
		if (request.style !== null) body['style'] = request.style;

		const payload = await this.post('/v1/rewrites', body, signal, 'rewriting');
		const result = parseRewrite(payload);
		if (!result) {
			throw new ReviewError('The rewriting service returned an unexpected response.');
		}
		return result;
	}

	private async post(
		path: string,
		body: Record<string, unknown>,
		signal: AbortSignal | undefined,
		label: string
	): Promise<unknown> {
		let response: Response;
		try {
			response = await fetch(`${this.base}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal
			});
		} catch (error) {
			/* fetch only rejects on a network-level failure: DNS, refused
			   connection, a certificate the browser refused, or CORS. */
			if (error instanceof DOMException && error.name === 'AbortError') throw error;
			throw new ReviewError(`Could not reach the ${label} service. Check your connection and that the API allows this site.`);
		}

		if (!response.ok) {
			throw new ReviewError(await this.describeFailure(response, label));
		}

		try {
			return await response.json();
		} catch {
			throw new ReviewError(`The ${label} service returned an unexpected response.`);
		}
	}

	private async describeFailure(response: Response, label: string): Promise<string> {
		if (response.status === 429) return 'Too many requests. Wait a moment and try again.';
		if (response.status >= 500) return `The ${label} service is having trouble. Try again shortly.`;

		/* The API may explain itself in JSON; fall back to the status line. */
		let payload: Record<string, unknown> = {};
		try {
			const parsed: unknown = await response.json();
			if (parsed !== null && typeof parsed === 'object') payload = parsed as Record<string, unknown>;
		} catch {
			/* Not JSON; the status line below is all there is. */
		}

		const message = payload['error'] ?? payload['message'];
		if (typeof message === 'string' && message !== '') return message;
		return `The ${label} service refused the request (HTTP ${response.status}).`;
	}
}
