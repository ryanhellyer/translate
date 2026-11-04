/**
 * Translator UI: languages, swapping, writing style, copy and offline speech,
 * plus the live translation itself.
 *
 * Translating is an AJAX call to the AI API (see translation-service.ts),
 * made as the visitor types and when the language pair or style changes. One
 * request is in flight at a time: a newer keystroke aborts the older call, so
 * the result always reflects the latest text.
 *
 * Either panel can be the one being written in. Whichever side the visitor
 * last edited is the source; the other side is replaced with its translation.
 * Only a human edit moves that focus — a translation arriving in a box is not
 * an edit, so it never bounces back. "Detect language" has no reverse gear,
 * so while it is the source the result box is locked and the direction stays
 * left-to-right.
 *
 * Runs only on the home page; other templates omit the translator card.
 * Dependencies arrive through the constructor (see app.ts), so a different
 * storage, clipboard, speech or translation implementation can be substituted
 * in one place.
 */

import { Toast } from '../ui/toast.js';
import { Clipboard } from '../ui/clipboard.js';
import { ICON_DONE } from '../ui/icons.js';
import { LanguageCatalog } from './language-catalog.js';
import { LanguageMenu } from './language-menu.js';
import { SpeechService } from './speech-service.js';
import { StorageService, type PersistedText } from './storage-service.js';
import { TranslationError, TranslationService, type TranslationRequest } from './translation-service.js';
import { TranslatorView } from './translator-view.js';
import {
	applySelection,
	otherSide,
	swapPair,
	type TranslatorState
} from './translator-state.js';
import { AUTO_CODE, type Side } from './languages.js';

/** Wait this long after the last keystroke before asking the API. */
const TYPING_PAUSE_MS = 500;

const SIDES: readonly Side[] = ['source', 'target'];

export class TranslatorController {
	private readonly storage: StorageService;
	private readonly clipboard: Clipboard;
	private readonly speech: SpeechService;
	private readonly toast: Toast;
	private readonly translations: TranslationService;

	private readonly state: TranslatorState;
	private readonly menus: Record<Side, LanguageMenu>;
	private readonly view: TranslatorView;
	private readonly copyIconHtml: string;
	private readonly catalog: LanguageCatalog;

	/** False while another mode is showing; the card then does no work. */
	private active = true;
	private speaking = false;
	/** The side the visitor is writing in; the other side is the result. */
	private activeSide: Side = 'source';
	/** The debounce timer and the request it is about to make, if any. */
	private typingTimer: ReturnType<typeof setTimeout> | null = null;
	private inFlight: AbortController | null = null;
	/** The text the current output corresponds to, to skip needless calls. */
	private translatedKey: string | null = null;

	constructor(
		view: TranslatorView,
		catalog: LanguageCatalog,
		storage: StorageService,
		clipboard: Clipboard,
		speech: SpeechService,
		toast: Toast,
		translations: TranslationService,
		state: TranslatorState
	) {
		this.storage = storage;
		this.clipboard = clipboard;
		this.speech = speech;
		this.toast = toast;
		this.translations = translations;
		this.view = view;
		this.catalog = catalog;
		this.state = state;
		this.copyIconHtml = view.copyButton.innerHTML;
		this.menus = {
			source: new LanguageMenu('source', catalog, this.menuCallbacks('source')),
			target: new LanguageMenu('target', catalog, this.menuCallbacks('target'))
		};
	}

	/* ---------- Start-up ---------- */

	/**
	 * `saved` is the text restored by the caller, and `active` says whether
	 * Translate is the mode the page opens in. When another mode starts, the
	 * initial translation is skipped so the API is not called for a panel
	 * nobody is looking at.
	 */
	init(saved: PersistedText, active: boolean): void {
		this.active = active;
		this.wireEvents();

		if (this.speech.supported) {
			this.speech.prime();
		} else {
			this.view.markUnsupportedSpeech();
		}

		if (saved.input !== null) this.view.setText('source', saved.input);
		/* Keep a restored translation on screen until the fresh one arrives. */
		if (saved.output !== null) this.view.setText('target', saved.output);

		/* Text only on the right means the visitor was writing there, so
		   resume in that direction instead of translating an empty box. */
		if (this.view.text('source').trim() === '' && this.view.text('target').trim() !== '') {
			this.activeSide = 'target';
		}

		this.render();
		if (this.active) this.view.focusInvitation(this.activeSide);
		void document.fonts.ready.then(() => this.view.autoSizeAll());

		/* Translate whatever is in the box now; any restored text above
		   stays on screen until the fresh translation arrives. */
		if (this.active) this.translate();
	}

	/**
	 * Suspends or resumes translation when the visitor switches mode. An
	 * in-flight request is cancelled on suspend; resuming asks for the
	 * current text unless the answer is already on screen.
	 */
	setActive(active: boolean): void {
		if (this.active === active) return;
		this.active = active;
		if (!active) {
			this.cancelTranslation();
			this.stopSpeaking();
			return;
		}
		this.translate();
	}

	/**
	 * Re-renders the language pair after another mode changed it — the
	 * proofreading picker shares this state — and persists the new choice.
	 */
	languagesChanged(): void {
		this.render();
		this.save();
	}

	/* ---------- Wiring ---------- */

	private wireEvents(): void {
		const { view } = this;

		view.swapButton.addEventListener('click', () => this.swap());
		for (const tab of view.languageTabs) {
			tab.addEventListener('click', () => {
				/* Stacked: each visible name opens its own language list,
				   Google-style. Desktop keeps the old swap-on-click tabs. */
				if (!view.isStacked) {
					this.swap();
					return;
				}
				const side: Side = tab.closest('#target-tabs') ? 'target' : 'source';
				this.toggleMenu(side);
			});
		}

		view.copyButton.addEventListener('click', () => void this.copyTranslation());
		view.clearButton.addEventListener('click', () => this.clear());
		view.listenButton.addEventListener('click', () => this.toggleSpeech());

		for (const side of SIDES) {
			view.fields[side].addEventListener('input', (event) => this.onEdit(side, event));
		}

		window.addEventListener('resize', () => {
			view.autoSizeAll();
			this.renderLabels();
			this.syncMenuState();
		});

		for (const side of SIDES) {
			const button = document.getElementById(`${side}-select`);
			button?.addEventListener('click', () => this.toggleMenu(side));
		}

		for (const button of view.styleButtons) {
			button.addEventListener('click', () => this.toggleStyle(button.dataset['style'] ?? null));
		}

		document.addEventListener('click', (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (target.closest('.lang-menu') || target.closest('.lang-select')) return;
			if (view.isStacked && target.closest('.lang-tab')) return;
			this.closeMenus();
		});

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') this.closeMenus();
		});
	}

	/**
	 * A human keystroke, paste, drop or undo. This is the only thing that can
	 * change which side is the source. A translation written into a box never
	 * reaches here: assigning `.value` does not fire `input`, and a
	 * synthesised event is never trusted.
	 */
	private onEdit(side: Side, event: Event): void {
		if (!event.isTrusted) return;
		/* An IME fires `input` for every candidate it previews; wait for the
		   committed text. */
		if (event instanceof InputEvent && event.isComposing) return;
		/* Auto-detect cannot run in reverse; the box is locked anyway, so this
		   is the belt to that pair of braces. */
		if (side === 'target' && this.state.source === AUTO_CODE) return;

		this.activeSide = side;
		this.view.setActiveSide(side);
		this.view.clearError();
		/* Stops an answer for the previous text landing in the box being
		   typed in. */
		this.cancelTranslation();
		this.view.updateCounter();
		this.view.updateActionButtons(this.derivedSide());
		this.save();
		this.scheduleTranslation();
	}

	private menuCallbacks(side: Side): { isActive(code: string): boolean; onSelect(code: string): void } {
		return {
			isActive: (code) => this.sideValue(side) === code,
			onSelect: (code) => this.selectLang(side, code)
		};
	}

	/* ---------- Rendering ---------- */

	private render(): void {
		this.renderLabels();
		for (const side of SIDES) {
			this.menus[side].refresh();
		}
		this.view.renderStyles(this.state);
		this.syncDirection();
		this.view.autoSizeAll();
		this.view.updateCounter();
		this.view.updateActionButtons(this.derivedSide());
	}

	/**
	 * Points the card at the side the visitor is writing in, and locks the
	 * result box while "Detect language" is the source.
	 */
	private syncDirection(): void {
		const canEditTarget = this.state.source !== AUTO_CODE;

		/* Turning auto-detect on can strand text in the result box. Move it
		   home rather than let the next translation wipe it. */
		if (!canEditTarget && this.activeSide === 'target') {
			if (this.view.text('source').trim() === '') {
				this.view.setText('source', this.view.text('target'));
				this.view.setText('target', '');
			}
			this.activeSide = 'source';
		}

		this.view.setTargetEditable(canEditTarget,
			'Choose a source language to edit the translation');
		this.view.setActiveSide(this.activeSide);
	}

	/** The panel currently holding the translation, which is the other one. */
	private derivedSide(): Side {
		return otherSide(this.activeSide);
	}

	/* The two languages currently being translated appear on the left of
	   each pulldown: source first, then target, on both sides. */
	private renderLabels(): void {
		this.view.renderLabels({
			source: this.catalog.language(this.state.source),
			target: this.catalog.language(this.state.target)
		});
	}

	/* ---------- Languages ---------- */

	private sideValue(side: Side): string {
		return side === 'source' ? this.state.source : this.state.target;
	}

	private selectLang(side: Side, code: string): void {
		if (!applySelection(this.state, side, code)) return;
		this.closeMenus();
		this.save();
		this.render();
		this.translate();
	}

	private toggleMenu(side: Side): void {
		const menu = this.menus[side];
		const wasOpen = menu.isOpen;
		this.closeMenus();
		if (!wasOpen) menu.open();
		this.syncMenuState();
	}

	private closeMenus(): void {
		this.menus.source.close();
		this.menus.target.close();
		this.syncMenuState();
	}

	/** Keeps aria-expanded on the visible language names in step with the menus. */
	private syncMenuState(): void {
		for (const side of SIDES) {
			this.view.markMenuExpanded(side, this.menus[side].isOpen);
		}
	}

	private swap(): void {
		swapPair(this.state);

		const sourceText = this.view.text('source');
		this.view.setText('source', this.view.text('target'));
		this.view.setText('target', sourceText);

		this.activeSide = 'source';
		this.translatedKey = null;
		this.save();
		this.render();
		this.translate();
	}

	/* ---------- Writing style ---------- */

	private toggleStyle(style: string | null): void {
		if (style === null) return;
		this.state.style = this.state.style === style ? null : style;
		this.save();
		this.view.renderStyles(this.state);
		this.translate();
	}

	/* ---------- Copy ---------- */

	private async copyTranslation(): Promise<void> {
		const copied = await this.clipboard.write(this.view.text(this.derivedSide()).trim());
		this.showToast(copied ? 'Translation copied' : 'Could not copy');
		if (!copied) return;

		const button = this.view.copyButton;
		button.innerHTML = ICON_DONE;
		setTimeout(() => { button.innerHTML = this.copyIconHtml; }, 1200);
	}

	private clear(): void {
		this.cancelTranslation();
		this.view.setText('source', '');
		this.view.setText('target', '');
		this.view.clearError();
		this.translatedKey = null;
		this.activeSide = 'source';
		this.view.setActiveSide('source');
		this.view.updateCounter();
		this.view.updateActionButtons('target');
		this.save();
		this.view.focusInvitation('source');
	}

	/* ---------- Translation ---------- */

	/** Debounces a keystroke into a single API call once typing settles. */
	private scheduleTranslation(): void {
		if (this.typingTimer !== null) clearTimeout(this.typingTimer);
		this.typingTimer = setTimeout(() => {
			this.typingTimer = null;
			this.translate();
		}, TYPING_PAUSE_MS);
	}

	/** Drops any pending or in-flight request without touching the text. */
	private cancelTranslation(): void {
		if (this.typingTimer !== null) {
			clearTimeout(this.typingTimer);
			this.typingTimer = null;
		}
		if (this.inFlight !== null) {
			this.inFlight.abort();
			this.inFlight = null;
		}
	}

	/**
	 * Asks the API for the active side's text and shows the result in the
	 * other side. Safe to call at any time: an empty box, an unchanged
	 * request, or a request already answered for the same text are all no-ops.
	 */
	private translate(): void {
		if (!this.active) return;
		const from = this.activeSide;
		const to = otherSide(from);
		const text = this.view.text(from).trim();

		if (text === '') {
			this.cancelTranslation();
			this.view.clearError();
			this.view.setBusy(false, to);
			this.view.setText(to, '');
			this.translatedKey = null;
			this.view.updateActionButtons(to);
			this.save();
			return;
		}

		/* Same text, languages and style as the translation on screen:
		   nothing to do. */
		const key = this.translationKey(from, text);
		if (key === this.translatedKey) return;

		this.cancelTranslation();
		const controller = new AbortController();
		this.inFlight = controller;
		this.view.clearError();
		this.view.setBusy(true, to);

		const request: TranslationRequest = {
			source: this.state[from],
			target: this.state[to],
			text,
			tone: this.state.style
		};

		void this.translations.translate(request, controller.signal)
			.then((translation) => {
				/* A newer request, or a switch of direction, replaced this
				   one while it was out. */
				if (this.inFlight !== controller || this.activeSide !== from) return;
				this.inFlight = null;
				this.view.setBusy(false, to);
				this.view.clearError();
				this.view.setText(to, translation);
				this.translatedKey = key;
				this.view.updateActionButtons(to);
				this.save();
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted || this.inFlight !== controller || this.activeSide !== from) return;
				this.inFlight = null;
				this.view.setBusy(false, to);
				this.translatedKey = null;
				this.view.showError(error instanceof TranslationError
					? error.message
					: 'Something went wrong while translating.');
				this.view.updateActionButtons(to);
				this.save();
			});
	}

	/** Identifies a request so identical ones are not repeated. */
	private translationKey(from: Side, text: string): string {
		const to = otherSide(from);
		const language = (side: Side): string => this.state[side] === AUTO_CODE ? 'en' : this.state[side];
		return `${language(from)}\u0000${language(to)}\u0000${this.state.style ?? ''}\u0000${text}`;
	}

	/* ---------- Speech ---------- */

	private toggleSpeech(): void {
		if (!this.speech.supported) {
			this.showToast('This browser cannot read text aloud');
			return;
		}
		if (this.speaking) {
			this.stopSpeaking();
			return;
		}

		const side = this.derivedSide();
		const language = this.catalog.language(this.state[side]);
		const text = this.view.text(side).trim();
		if (!text) return;

		if (!this.speech.hasVoice(language)) {
			this.showToast(`No offline ${language.name} voice on this device`);
			return;
		}

		this.speaking = true;
		this.view.setSpeaking(true);
		this.speech.speak(text, language, () => this.stopSpeaking());
	}

	private stopSpeaking(): void {
		this.speech.cancel();
		this.speaking = false;
		this.view.setSpeaking(false);
	}

	/* ---------- Bits and pieces ---------- */

	private showToast(message: string): void {
		this.toast.show(message);
	}

	private save(): void {
		this.storage.save(this.state, {
			input: this.view.text('source'),
			output: this.view.text('target')
		});
	}
}
