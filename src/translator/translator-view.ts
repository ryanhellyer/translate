/**
 * Every element the translator owns, resolved once so the rest of the code
 * can stop asking the document where things are.
 */

import { optionalElement, requireElement, requireElementById } from '../ui/dom.js';
import type { Language, Side } from './languages.js';
import type { TranslatorState } from './translator-state.js';

/** Below this width the panels stack and the source box grows with its text. */
const STACKED_QUERY = '(max-width: 768px)';

export class TranslatorView {
	readonly card: HTMLElement = requireElement<HTMLElement>('.translator-card');
	readonly textarea: HTMLTextAreaElement = requireElement<HTMLTextAreaElement>('.panel.source textarea');
	readonly output: HTMLElement = requireElement<HTMLElement>('.panel.target .translation');
	readonly targetPanel: HTMLElement = requireElement<HTMLElement>('.panel.target');
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

	/** True on the narrow layout, where the language names open the menus. */
	get isStacked(): boolean {
		return window.matchMedia(STACKED_QUERY).matches;
	}

	get input(): string {
		return this.textarea.value;
	}

	set input(value: string) {
		this.textarea.value = value;
		this.autoSizeInput();
	}

	/**
	 * Grows the source box to fit what is in it, so the page scrolls rather
	 * than the textarea on the stacked layout. Desktop keeps its equal-height
	 * side-by-side panels.
	 */
	autoSizeInput(): void {
		if (!this.isStacked) {
			this.textarea.style.removeProperty('height');
			return;
		}
		this.textarea.style.height = 'auto';
		this.textarea.style.height = `${this.textarea.scrollHeight}px`;
	}

	get outputText(): string {
		return this.output.textContent ?? '';
	}

	set outputText(value: string) {
		this.output.textContent = value;
		this.syncOutput();
	}

	/**
	 * On mobile the result panel is not there until there is something to
	 * show; the stylesheet reveals it from this class.
	 */
	private syncOutput(): void {
		const hasOutput = this.outputText.trim() !== '' || this.output.classList.contains('is-error');
		this.targetPanel.classList.toggle('has-output', hasOutput);
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
		this.syncOutput();
	}

	/** Clears the error styling before the next normal render. */
	clearError(): void {
		this.output.classList.remove('is-error');
		this.syncOutput();
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
		this.syncOutput();
	}

	renderLabels(pair: { source: Language; target: Language }): void {
		const stacked = this.isStacked;
		for (const side of ['source', 'target'] as const) {
			const tabs = requireElementById<HTMLElement>(`${side}-tabs`);
			const from = requireElement<HTMLElement>('.lang-tab.from', tabs);
			const into = requireElement<HTMLElement>('.lang-tab.into', tabs);
			from.textContent = pair.source.name;
			into.textContent = pair.target.name;

			/* On mobile each name is the button that opens its language
			   menu; on desktop the tabs swap the pair. */
			from.setAttribute('aria-label', stacked
				? `Choose source language, currently ${pair.source.name}`
				: 'Swap to translate into this language');
			into.setAttribute('aria-label', stacked
				? `Choose target language, currently ${pair.target.name}`
				: 'Swap to translate from this language');
			for (const tab of [from, into]) {
				if (stacked) {
					tab.setAttribute('aria-haspopup', 'true');
				} else {
					tab.removeAttribute('aria-haspopup');
					tab.removeAttribute('aria-expanded');
				}
			}
		}
	}

	/** Mirrors a menu's open state onto the language names that open it. */
	markMenuExpanded(side: Side, open: boolean): void {
		const tabs = requireElementById<HTMLElement>(`${side}-tabs`);
		for (const tab of tabs.querySelectorAll<HTMLElement>('.lang-tab')) {
			if (tab.hasAttribute('aria-haspopup')) {
				tab.setAttribute('aria-expanded', open ? 'true' : 'false');
			}
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
