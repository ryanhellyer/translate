/**
 * Translator UI: languages, swapping, writing style, copy and offline speech,
 * plus the live translation itself.
 *
 * Translating is an AJAX call to the AI API (see translation-service.ts),
 * made as the visitor types and when the language pair or style changes. One
 * request is in flight at a time: a newer keystroke aborts the older call, so
 * the output always reflects the latest input. Runs only on the home page;
 * other templates omit the translator card.
 *
 * Constructor dependencies are resolved by tsyringe, so a different storage,
 * clipboard, speech or translation implementation can be substituted in one
 * place.
 */

import { injectable } from 'tsyringe';

import { Toast } from '../ui/toast.js';
import { Clipboard } from '../ui/clipboard.js';
import { ICON_DONE } from '../ui/icons.js';
import { LanguageCatalog } from './language-catalog.js';
import { LanguageMenu } from './language-menu.js';
import { SpeechService } from './speech-service.js';
import { StorageService } from './storage-service.js';
import { TranslationError, TranslationService, type TranslationRequest } from './translation-service.js';
import { TranslatorView } from './translator-view.js';
import {
	applySelection,
	createDefaultState,
	swapPair,
	type TranslatorState
} from './translator-state.js';
import { AUTO_CODE, type Side } from './languages.js';

/** Wait this long after the last keystroke before asking the API. */
const TYPING_PAUSE_MS = 500;

@injectable()
export class TranslatorController {
	private readonly storage: StorageService;
	private readonly clipboard: Clipboard;
	private readonly speech: SpeechService;
	private readonly toast: Toast;
	private readonly translations: TranslationService;

	private readonly state: TranslatorState = createDefaultState();
	private readonly menus: Record<Side, LanguageMenu>;
	private readonly view: TranslatorView;
	private readonly copyIconHtml: string;
	private readonly catalog: LanguageCatalog;

	private speaking = false;
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
		translations: TranslationService
	) {
		this.storage = storage;
		this.clipboard = clipboard;
		this.speech = speech;
		this.toast = toast;
		this.translations = translations;
		this.view = view;
		this.catalog = catalog;
		this.copyIconHtml = view.copyButton.innerHTML;
		this.menus = {
			source: new LanguageMenu('source', catalog, this.menuCallbacks('source')),
			target: new LanguageMenu('target', catalog, this.menuCallbacks('target'))
		};
	}

	/* ---------- Start-up ---------- */

	init(): void {
		this.wireEvents();

		if (this.speech.supported) {
			this.speech.prime();
		} else {
			this.view.markUnsupportedSpeech();
		}

		const saved = this.storage.restore(this.state);
		if (saved.input !== null) this.view.input = saved.input;

		this.render();
		this.view.focusInvitation();

		/* Translate whatever is in the box now. A restored output from a
		   previous visit is kept on screen until the fresh one arrives. */
		this.translate();
	}

	/* ---------- Wiring ---------- */

	private wireEvents(): void {
		const { view } = this;

		view.swapButton.addEventListener('click', () => this.swap());
		for (const tab of view.languageTabs) {
			tab.addEventListener('click', () => this.swap());
		}

		view.copyButton.addEventListener('click', () => void this.copyTranslation());
		view.clearButton.addEventListener('click', () => this.clear());
		view.listenButton.addEventListener('click', () => this.toggleSpeech());

		view.textarea.addEventListener('input', () => {
			view.updateCounter();
			view.updateActionButtons();
			this.save();
			this.scheduleTranslation();
		});

		for (const side of ['source', 'target'] as const) {
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
			this.closeMenus();
		});

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') this.closeMenus();
		});
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
		for (const side of ['source', 'target'] as const) {
			this.menus[side].refresh();
		}
		this.view.renderStyles(this.state);
		this.view.updateCounter();
		this.view.updateActionButtons();
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
	}

	private closeMenus(): void {
		this.menus.source.close();
		this.menus.target.close();
	}

	private swap(): void {
		swapPair(this.state);

		const oldSource = this.view.input;
		this.view.input = this.view.outputText;
		this.view.outputText = oldSource;

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
		const copied = await this.clipboard.write(this.view.outputText.trim());
		this.showToast(copied ? 'Translation copied' : 'Could not copy');
		if (!copied) return;

		const button = this.view.copyButton;
		button.innerHTML = ICON_DONE;
		setTimeout(() => { button.innerHTML = this.copyIconHtml; }, 1200);
	}

	private clear(): void {
		this.cancelTranslation();
		this.view.input = '';
		this.view.clearError();
		this.view.outputText = '';
		this.translatedKey = null;
		this.view.updateCounter();
		this.view.updateActionButtons();
		this.save();
		this.view.textarea.focus();
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

	/** Drops any pending or in-flight request without touching the output. */
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
	 * Asks the API for the current text and shows the result. Safe to call at
	 * any time: an empty box, an unchanged request, or a request already
	 * answered for the same text are all no-ops.
	 */
	private translate(): void {
		const text = this.view.input.trim();

		if (text === '') {
			this.cancelTranslation();
			this.view.clearError();
			this.view.setBusy(false);
			this.view.outputText = '';
			this.translatedKey = null;
			this.view.updateActionButtons();
			this.save();
			return;
		}

		/* Same text, languages and style as the output on screen: nothing to do. */
		const key = this.translationKey(text);
		if (key === this.translatedKey) return;

		this.cancelTranslation();
		const controller = new AbortController();
		this.inFlight = controller;
		this.view.clearError();
		this.view.setBusy(true);

		const request: TranslationRequest = {
			source: this.state.source,
			target: this.state.target,
			text,
			tone: this.state.style
		};

		void this.translations.translate(request, controller.signal)
			.then((translation) => {
				/* A newer request may have replaced this one while it was out. */
				if (this.inFlight !== controller) return;
				this.inFlight = null;
				this.view.setBusy(false);
				this.view.clearError();
				this.view.outputText = translation;
				this.translatedKey = key;
				this.view.updateActionButtons();
				this.save();
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted || this.inFlight !== controller) return;
				this.inFlight = null;
				this.view.setBusy(false);
				this.translatedKey = null;
				this.view.showError(error instanceof TranslationError
					? error.message
					: 'Something went wrong while translating.');
				this.view.updateActionButtons();
				this.save();
			});
	}

	/** Identifies a request so identical ones are not repeated. */
	private translationKey(text: string): string {
		const source = this.state.source === AUTO_CODE ? 'en' : this.state.source;
		return `${source}\u0000${this.state.target}\u0000${this.state.style ?? ''}\u0000${text}`;
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

		const target = this.catalog.language(this.state.target);
		const text = this.view.outputText.trim();
		if (!text) return;

		if (!this.speech.hasVoice(target)) {
			this.showToast(`No offline ${target.name} voice on this device`);
			return;
		}

		this.speaking = true;
		this.view.setSpeaking(true);
		this.speech.speak(text, target, () => this.stopSpeaking());
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
			input: this.view.input,
			output: this.view.outputText
		});
	}
}
