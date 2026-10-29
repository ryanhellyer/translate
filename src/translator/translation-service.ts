/**
 * The translation engine: a call to the AI API.
 *
 * The request matches the API's contract exactly —
 *
 *   POST {base}/v1/translations
 *   { "from": "English", "to": "German", "text": "...", "tone": "formal" }
 *   -> { "translation": "..." }
 *
 * — where the languages are the English names the catalogue already carries
 * (see `apiName` in languages.ts) rather than the two-letter codes the UI
 * works in, and `tone` is the writing style, omitted when none is chosen.
 *
 * Two local-development realities are handled here rather than pretended
 * away. The dev API at https://ai.hellyer.test uses a self-signed certificate
 * and sends no CORS headers, so a browser must be started with
 * --ignore-certificate-errors and the API must answer cross-origin requests.
 * Nothing in JavaScript can override either of those; see README.md. This
 * service simply reports a failure clearly when the browser blocks the call.
 */

import { apiName, type LanguageCode } from './languages.js';

/** Where the API lives. Overridable per page via `data-api-base`. */
export const DEFAULT_API_BASE = 'https://ai.hellyer.kiwi';

export interface TranslationRequest {
	readonly source: LanguageCode;
	readonly target: LanguageCode;
	readonly text: string;
	readonly tone: string | null;
}

/** A failure the UI can show without leaking a stack trace. */
export class TranslationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TranslationError';
	}
}

export class TranslationService {
	private readonly base: string;

	constructor(base: string = DEFAULT_API_BASE) {
		this.base = base.replace(/\/+$/, '');
	}

	/**
	 * Translates `request`, resolving with the translated text.
	 *
	 * `signal` lets the caller cancel a request whose text has been replaced;
	 * the controller uses that to keep one in-flight request at a time.
	 */
	async translate(request: TranslationRequest, signal?: AbortSignal): Promise<string> {
		const body: Record<string, string> = {
			from: apiName(request.source),
			to: apiName(request.target),
			text: request.text
		};
		if (request.tone !== null) body['tone'] = request.tone;

		let response: Response;
		try {
			response = await fetch(`${this.base}/v1/translations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal
			});
		} catch (error) {
			/* fetch only rejects on a network-level failure: DNS, refused
			   connection, a certificate the browser refused, or CORS. A
			   blocked cross-origin response surfaces as a TypeError with no
			   detail, so say the one thing that is actionable. */
			if (error instanceof DOMException && error.name === 'AbortError') throw error;
			throw new TranslationError('Could not reach the translation service. Check your connection and that the API allows this site.');
		}

		if (!response.ok) {
			throw new TranslationError(await this.describeFailure(response));
		}

		const payload = await this.readJson(response);
		const translation = payload['translation'];
		if (typeof translation !== 'string') {
			throw new TranslationError('The translation service returned an unexpected response.');
		}
		return translation;
	}

	private async describeFailure(response: Response): Promise<string> {
		if (response.status === 429) return 'Too many requests. Wait a moment and try again.';
		if (response.status >= 500) return 'The translation service is having trouble. Try again shortly.';

		/* The API may explain itself in JSON; fall back to the status line. */
		const payload = await this.readJson(response);
		const message = payload['error'] ?? payload['message'];
		if (typeof message === 'string' && message !== '') return message;
		return `The translation service refused the request (HTTP ${response.status}).`;
	}

	private async readJson(response: Response): Promise<Record<string, unknown>> {
		try {
			const parsed: unknown = await response.json();
			return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
		} catch {
			return {};
		}
	}
}
