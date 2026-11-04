/**
 * Every element the translator owns, resolved once so the rest of the code
 * can stop asking the document where things are.
 *
 * Both panels are textareas writing in the same font, so a sentence lays out
 * identically whichever side it is on. Nothing here calls one panel "the
 * input": either side can be the text being translated, so everything is
 * addressed by side.
 */

import { optionalElement, requireElement, requireElementById } from '../ui/dom.js';
import type { Language, Side } from './languages.js';
import type { TranslatorState } from './translator-state.js';

/** Below this width the panels stack and the boxes grow with their text. */
const STACKED_QUERY = '(max-width: 768px)';

const SIDES: readonly Side[] = ['source', 'target'];

export class TranslatorView {
	readonly card: HTMLElement = requireElement<HTMLElement>('.translator-card');
	readonly fields: Record<Side, HTMLTextAreaElement> = {
		source: requireElement<HTMLTextAreaElement>('.panel.source textarea'),
		target: requireElement<HTMLTextAreaElement>('.panel.target .translation')
	};
	readonly panels: Record<Side, HTMLElement> = {
		source: requireElement<HTMLElement>('.panel.source'),
		target: requireElement<HTMLElement>('.panel.target')
	};
	readonly error: HTMLElement = requireElement<HTMLElement>('.panel.target .translation-error');
	readonly counter: HTMLElement = requireElement<HTMLElement>('.panel.source .char-count');
	readonly swapButton: HTMLElement = requireElementById<HTMLElement>('swap-btn');
	readonly listenButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('listen-btn');
	readonly copyButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('copy-btn');
	readonly clearButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('clear-btn');
	readonly styleButtons: HTMLElement[] = [
		...document.querySelectorAll<HTMLElement>('.translator-card .style-bar[data-part="translate"] .style-option[data-style]')
	];
	readonly languageTabs: HTMLElement[] = [...document.querySelectorAll<HTMLElement>('.lang-tab')];

	/** Which side the visitor is writing in; the other side is the result. */
	private active: Side = 'source';

	static exists(): boolean {
		return optionalElement('.translator-card') !== null;
	}

	/** True on the narrow layout, where the language names open the menus. */
	get isStacked(): boolean {
		return window.matchMedia(STACKED_QUERY).matches;
	}

	text(side: Side): string {
		return this.fields[side].value;
	}

	/**
	 * Writes a translation into the side that is not being edited. Assigning
	 * `.value` never fires `input`, so this cannot feed back into the editor.
	 */
	setText(side: Side, value: string): void {
		const field = this.fields[side];
		if (field.value !== value) field.value = value;
		this.autoSize(side);
		this.syncPanels();
		/* A translation arriving in the source box changes its length too. */
		this.updateCounter();
	}

	/**
	 * Grows a box to fit what is in it, so the page scrolls rather than the
	 * box on the stacked layout. Desktop keeps its equal-height side-by-side
	 * panels, where the browser's own scrolling takes over.
	 */
	autoSize(side: Side): void {
		const field = this.fields[side];
		if (!this.isStacked) {
			field.style.removeProperty('height');
			return;
		}
		/* A box hidden behind an error message has no height to measure. */
		if (field.getClientRects().length === 0) return;
		field.style.height = 'auto';
		field.style.height = `${field.scrollHeight}px`;
	}

	autoSizeAll(): void {
		for (const side of SIDES) this.autoSize(side);
	}

	/** Tells the layout which box is the one being typed in. */
	setActiveSide(side: Side): void {
		this.active = side;
		for (const other of SIDES) {
			this.panels[other].classList.toggle('is-active', other === side);
		}
		this.syncPanels();
	}

	/**
	 * On mobile the result panel is not there until there is something to
	 * show, or until it is the box being typed in. The stylesheet reveals it
	 * from this class.
	 */
	private syncPanels(): void {
		const target = this.panels.target;
		const hasText = this.text('target').trim() !== '';
		const revealed = hasText || this.isErrored || this.active === 'target';
		target.classList.toggle('has-output', revealed);
	}

	/** True while a translation is in flight, so callers can leave the text be. */
	get isBusy(): boolean {
		return this.card.classList.contains('is-translating');
	}

	/**
	 * Dims the side being replaced and marks it busy. The side the visitor is
	 * typing in is left alone, so their own words never flicker.
	 */
	setBusy(busy: boolean, derivedSide: Side): void {
		this.card.classList.toggle('is-translating', busy);
		for (const side of SIDES) {
			this.panels[side].classList.toggle('is-deriving', busy && side === derivedSide);
			this.panels[side].setAttribute('aria-busy', busy && side === derivedSide ? 'true' : 'false');
		}
	}

	get isErrored(): boolean {
		return this.panels.target.classList.contains('is-error');
	}

	/** Shows a failure in place of the translation, in the error colour. */
	showError(message: string): void {
		this.panels.target.classList.add('is-error');
		this.error.textContent = message;
		this.error.hidden = false;
		this.syncPanels();
	}

	/** Clears the error styling before the next normal render. */
	clearError(): void {
		this.panels.target.classList.remove('is-error');
		this.error.textContent = '';
		this.error.hidden = true;
		this.syncPanels();
	}

	/**
	 * Auto-detect has no reverse gear, so the result box can be locked while
	 * it is on. A locked box still selects, copies and reads aloud.
	 */
	setTargetEditable(editable: boolean, reason: string): void {
		const field = this.fields.target;
		field.readOnly = !editable;
		field.classList.toggle('is-locked', !editable);
		if (editable) {
			field.removeAttribute('title');
		} else {
			field.title = reason;
		}
	}

	updateCounter(): void {
		const length = this.text('source').length;
		this.counter.textContent = `${length.toLocaleString('en-NZ')} / 20,000`;
		this.counter.classList.toggle('warn', length > 18000);
		this.clearButton.hidden = length === 0 && this.text('target').length === 0;
	}

	/** Copy and listen act on the side holding the translation. */
	updateActionButtons(translationSide: Side): void {
		const empty = this.text(translationSide).trim() === '' || this.isErrored;
		this.copyButton.disabled = empty;
		this.listenButton.disabled = empty;
		this.syncPanels();
	}

	renderLabels(pair: { source: Language; target: Language }): void {
		const stacked = this.isStacked;
		for (const side of SIDES) {
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
	focusInvitation(side: Side): void {
		if (this.text(side) !== '') return;
		if (!window.matchMedia('(pointer: fine)').matches) return;
		if (window.innerWidth <= 768) return;
		this.fields[side].focus({ preventScroll: true });
	}
}
