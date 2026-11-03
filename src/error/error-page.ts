/**
 * Paints the error card with the right copy, and wires the retry button.
 */

import { requireElementById } from '../ui/dom.js';
import { ErrorDetector } from './error-detector.js';
import { categoryFor, GENERIC, MESSAGES, type ErrorCopy } from './messages.js';

export class ErrorPage {
	readonly statusCode: HTMLElement = requireElementById<HTMLElement>('status-code');
	readonly statusCategory: HTMLElement = requireElementById<HTMLElement>('status-category');
	readonly statusTitle: HTMLElement = requireElementById<HTMLElement>('status-title');
	readonly statusJoke: HTMLElement = requireElementById<HTMLElement>('status-joke');
	readonly statusAdvice: HTMLElement = requireElementById<HTMLElement>('status-advice');
	readonly metaStatus: HTMLElement = requireElementById<HTMLElement>('meta-status');
	readonly metaUrl: HTMLElement = requireElementById<HTMLElement>('meta-url');
	readonly metaReferrer: HTMLElement = requireElementById<HTMLElement>('meta-referrer');
	readonly metaTime: HTMLElement = requireElementById<HTMLElement>('meta-time');
	readonly retryButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('retry-btn');

	static exists(): boolean {
		return document.getElementById('status-code') !== null;
	}

	static start(): ErrorPage {
		const page = new ErrorPage();
		page.render();
		return page;
	}

	render(detector = new ErrorDetector()): void {
		const { code, target } = detector.detect();
		const message: ErrorCopy = MESSAGES[code] ?? GENERIC;

		document.title = `${code} ${message.category} \u2014 translate.hellyer.kiwi`;

		const category = MESSAGES[code] ? message.category : categoryFor(code);
		this.statusCode.textContent = String(code);
		this.statusCategory.textContent = category;
		this.statusTitle.textContent = message.title;
		this.statusJoke.textContent = message.joke;
		this.statusAdvice.textContent = message.advice;

		this.metaStatus.textContent = `${code} ${category}`;
		this.metaUrl.textContent = target ?? 'Not recorded by the server \u2014 ' +
			'add ?code= and the original path to fix that.';
		this.metaReferrer.textContent = detector.referrerUrl || 'Nothing. You arrived alone.';
		this.metaTime.textContent = this.formatTime();

		/* Retry: go back through history so the original URL is retried, and
		   reload as the fallback when there is no history to walk. */
		this.retryButton.addEventListener('click', () => {
			if (window.history.length > 1) window.history.back();
			else window.location.reload();
		});
	}

	private formatTime(): string {
		try {
			return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'medium' });
		} catch {
			return new Date().toString();
		}
	}
}
