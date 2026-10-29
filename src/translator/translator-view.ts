/**
 * Every element the translator owns, resolved once so the rest of the code
 * can stop asking the document where things are.
 */

import { optionalElement, requireElement, requireElementById } from '../ui/dom.js';
import type { Language } from './languages.js';
import type { TranslatorState } from './translator-state.js';

export class TranslatorView {
	readonly card: HTMLElement = requireElement<HTMLElement>('.translator-card');
	readonly textarea: HTMLTextAreaElement = requireElement<HTMLTextAreaElement>('.panel.source textarea');
	readonly output: HTMLElement = requireElement<HTMLElement>('.panel.target .translation');
	readonly counter: HTMLElement = requireElement<HTMLElement>('.panel.source .char-count');
	readonly swapButton: HTMLElement = requireElementById<HTMLElement>('swap-btn');
	readonly listenButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('listen-btn');
	readonly copyButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('copy-btn');
	readonly clearButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('clear-btn');
	readonly styleButtons: HTMLElement[] = [...document.querySelectorAll<HTMLElement>('.style-option')];
	readonly languageTabs: HTMLElement[] = [...document.querySelectorAll<HTMLElement>('.lang-tab')];

	static exists(): boolean {
		return optionalElement('.translator-card') !== null;
	}

	get input(): string {
		return this.textarea.value;
	}

	set input(value: string) {
		this.textarea.value = value;
	}

	get outputText(): string {
		return this.output.textContent ?? '';
	}

	set outputText(value: string) {
		this.output.textContent = value;
	}

	/** True while a translation is in flight, so callers can leave the text be. */
	get isBusy(): boolean {
		return this.card.classList.contains('is-translating');
	}

	/** Dims the output and marks the card busy while the API is called. */
	setBusy(busy: boolean): void {
		this.card.classList.toggle('is-translating', busy);
		this.output.setAttribute('aria-busy', busy ? 'true' : 'false');
	}

	/** Shows a failure in place of the translation, in the error colour. */
	showError(message: string): void {
		this.output.classList.add('is-error');
		this.output.textContent = message;
	}

	/** Clears the error styling before the next normal render. */
	clearError(): void {
		this.output.classList.remove('is-error');
	}

	updateCounter(): void {
		const length = this.input.length.toLocaleString('en-NZ');
		this.counter.textContent = `${length} / 5,000`;
		this.counter.classList.toggle('warn', this.input.length > 4500);
		this.clearButton.hidden = this.input.length === 0;
	}

	/** Copy and listen are meaningless with nothing to read, or on an error. */
	updateActionButtons(): void {
		const empty = this.outputText.trim() === '' || this.output.classList.contains('is-error');
		this.copyButton.disabled = empty;
		this.listenButton.disabled = empty;
	}

	renderLabels(pair: { source: Language; target: Language }): void {
		for (const side of ['source', 'target'] as const) {
			const tabs = requireElementById<HTMLElement>(`${side}-tabs`);
			const from = requireElement<HTMLElement>('.lang-tab.from', tabs);
			const into = requireElement<HTMLElement>('.lang-tab.into', tabs);
			from.textContent = pair.source.name;
			into.textContent = pair.target.name;
		}
	}

	renderStyles(state: TranslatorState): void {
		for (const button of this.styleButtons) {
			const active = button.dataset['style'] === state.style;
			button.classList.toggle('active', active);
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		}
	}

	setSpeaking(speaking: boolean): void {
		this.listenButton.classList.toggle('is-speaking', speaking);
		this.listenButton.setAttribute('aria-pressed', speaking ? 'true' : 'false');
		this.listenButton.setAttribute('aria-label', speaking ? 'Stop reading' : 'Listen to translation');
	}

	markUnsupportedSpeech(): void {
		this.listenButton.setAttribute('aria-label', 'Text reading is not supported in this browser');
	}

	/** On a keyboard-first device an empty box is an invitation. */
	focusInvitation(): void {
		if (this.input !== '') return;
		if (!window.matchMedia('(pointer: fine)').matches) return;
		if (window.innerWidth <= 768) return;
		this.textarea.focus({ preventScroll: true });
	}
}
