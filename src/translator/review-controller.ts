/**
 * Analyse and Rewrite: the learner's own text, checked or polished.
 *
 * The two modes share one input box and one debounced request pattern. The
 * active mode is decided by mode-controller.ts; this controller only does
 * work while one of the proofreading modes is showing.
 *
 * Like translation, the check runs as the visitor types, and a newer
 * keystroke aborts the request that is already out so a stale answer can
 * never land under fresh text.
 */

import type { Clipboard } from '../ui/clipboard.js';
import { readStorage, writeStorage } from '../ui/dom.js';
import { ICON_DONE } from '../ui/icons.js';
import type { Toast } from '../ui/toast.js';
import type { LanguageCatalog } from './language-catalog.js';
import { AUTO_CODE } from './languages.js';
import type { Mode } from './mode-controller.js';
import {
	CHECK_IDS,
	isCheckId,
	isRewriteStyle,
	type AnalysisResult,
	type CheckId,
	type ReviewMode,
	type RewriteResult,
	type RewriteStyle
} from './review-model.js';
import { ReviewError, type ReviewService } from './review-service.js';
import type { ReviewView } from './review-view.js';
import type { SpeechService } from './speech-service.js';
import type { TranslatorState } from './translator-state.js';

/** Wait this long after the last keystroke before asking the API. */
const TYPING_PAUSE_MS = 600;

const REVIEW_STORE_KEY = 'translate-review';

export class ReviewController {
	private readonly view: ReviewView;
	private readonly service: ReviewService;
	private readonly catalog: LanguageCatalog;
	private readonly state: TranslatorState;
	private readonly clipboard: Clipboard;
	private readonly speech: SpeechService;
	private readonly toast: Toast;

	private mode: Mode = 'translate';
	private checks = new Set<CheckId>(CHECK_IDS);
	private style: RewriteStyle | null = null;
	private typingTimer: ReturnType<typeof setTimeout> | null = null;
	private inFlight: AbortController | null = null;
	private analyseKey: string | null = null;
	private rewriteKey: string | null = null;
	private analysis: AnalysisResult | null = null;
	private rewrite: RewriteResult | null = null;
	private speaking: ReviewMode | null = null;

	private readonly copyIconHtml: { analyse: string; rewrite: string };

	constructor(
		view: ReviewView,
		service: ReviewService,
		catalog: LanguageCatalog,
		state: TranslatorState,
		clipboard: Clipboard,
		speech: SpeechService,
		toast: Toast
	) {
		this.view = view;
		this.service = service;
		this.catalog = catalog;
		this.state = state;
		this.clipboard = clipboard;
		this.speech = speech;
		this.toast = toast;
		this.copyIconHtml = {
			analyse: view.analyseCopy.innerHTML,
			rewrite: view.rewriteCopy.innerHTML
		};
	}

	/* ---------- Start-up ---------- */

	init(): void {
		this.restore();
		this.renderLanguages();
		this.wireEvents();
		this.view.updateCounter();
		this.view.autoSize();
		this.renderChecks();
		this.renderStyle();

		if (!this.speech.supported) this.view.markUnsupportedSpeech();

		this.view.showAnalysisEmpty();
		this.view.showRewriteEmpty();

		window.addEventListener('resize', () => this.view.autoSize());
		void document.fonts.ready.then(() => this.view.autoSize());
	}

	/* ---------- Wiring ---------- */

	private wireEvents(): void {
		this.view.input.addEventListener('input', () => this.onInput());

		this.view.clearButton.addEventListener('click', () => this.clear());

		for (const button of this.checkButtons()) {
			button.addEventListener('click', () => this.toggleCheck(button.dataset['check']));
		}

		for (const button of this.styleButtons()) {
			button.addEventListener('click', () => this.toggleStyle(button.dataset['rewriteStyle']));
		}

		this.view.analyseCopy.addEventListener('click', () => void this.copyText('analyse'));
		this.view.rewriteCopy.addEventListener('click', () => void this.copyText('rewrite'));
		this.view.analyseListen.addEventListener('click', () => this.toggleSpeech('analyse'));
		this.view.rewriteListen.addEventListener('click', () => this.toggleSpeech('rewrite'));

		requireButton('prev-issue').addEventListener('click', () => this.stepIssue(-1));
		requireButton('next-issue').addEventListener('click', () => this.stepIssue(1));
		requireButton('close-insight').addEventListener('click', () => this.view.selectIssue(0));

		/* A flag click selects its explanation. Delegated so it survives
		   every re-render of the annotated text. */
		this.view.analyseText.addEventListener('click', (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const flag = target.closest<HTMLElement>('.review-flag');
			const issue = flag?.dataset['issue'];
			if (issue !== undefined) this.view.selectIssue(Number(issue));
		});
	}

	private checkButtons(): HTMLButtonElement[] {
		return [...document.querySelectorAll<HTMLButtonElement>('.style-option[data-check]')];
	}

	private styleButtons(): HTMLButtonElement[] {
		return [...document.querySelectorAll<HTMLButtonElement>('.style-option[data-rewrite-style]')];
	}

	/* ---------- Mode ---------- */

	/** Called whenever the card switches mode. */
	setMode(mode: Mode): void {
		this.mode = mode;

		if (mode === 'translate') {
			this.cancel();
			this.stopSpeech();
			return;
		}

		/* Leaving the other proofreading mode, or coming back to this one,
		   starts from a clean slate: no stale request, no reading voice. */
		this.cancel();
		this.stopSpeech();
		this.renderLanguages();
		if (this.view.text().trim() === '') {
			if (mode === 'analyse') this.view.showAnalysisEmpty();
			else this.view.showRewriteEmpty();
			return;
		}
		this.run();
	}

	/* ---------- Input ---------- */

	private onInput(): void {
		this.view.updateCounter();
		this.view.autoSize();
		this.save();

		if (this.mode === 'translate') return;

		this.cancel();
		this.stopSpeech();
		this.analysis = null;
		this.rewrite = null;
		this.analyseKey = null;
		this.rewriteKey = null;

		if (this.view.text().trim() === '') {
			if (this.mode === 'analyse') this.view.showAnalysisEmpty();
			else this.view.showRewriteEmpty();
			return;
		}

		if (this.mode === 'analyse') this.view.showAnalysisBusy();
		else this.view.showRewriteBusy();
		this.schedule();
	}

	private clear(): void {
		this.cancel();
		this.stopSpeech();
		this.view.setText('');
		this.view.updateCounter();
		this.analysis = null;
		this.rewrite = null;
		this.analyseKey = null;
		this.rewriteKey = null;
		this.save();
		this.view.showAnalysisEmpty();
		this.view.showRewriteEmpty();
		if (this.mode !== 'translate') this.view.input.focus();
	}

	/* ---------- Checks and styles ---------- */

	private toggleCheck(id: string | undefined): void {
		if (!isCheckId(id)) return;
		if (this.checks.has(id)) {
			/* Never leave zero checks on: the request would have nothing to do. */
			if (this.checks.size === 1) return;
			this.checks.delete(id);
		} else {
			this.checks.add(id);
		}
		this.renderChecks();
		if (this.mode === 'analyse') this.run();
	}

	private toggleStyle(value: string | undefined): void {
		const style = value === undefined || value === '' || value === 'natural'
			? null
			: (isRewriteStyle(value) ? value : null);
		this.style = style;
		this.renderStyle();
		this.save();
		if (this.mode === 'rewrite') this.run();
	}

	private renderChecks(): void {
		for (const button of this.checkButtons()) {
			const id = button.dataset['check'];
			const active = isCheckId(id) && this.checks.has(id);
			button.classList.toggle('active', active);
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		}
	}

	private renderStyle(): void {
		const current = this.style ?? 'natural';
		for (const button of this.styleButtons()) {
			const active = button.dataset['rewriteStyle'] === current;
			button.classList.toggle('active', active);
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		}
	}

	/* ---------- Requests ---------- */

	private schedule(): void {
		if (this.typingTimer !== null) clearTimeout(this.typingTimer);
		this.typingTimer = setTimeout(() => {
			this.typingTimer = null;
			this.run();
		}, TYPING_PAUSE_MS);
	}

	private cancel(): void {
		if (this.typingTimer !== null) {
			clearTimeout(this.typingTimer);
			this.typingTimer = null;
		}
		if (this.inFlight !== null) {
			this.inFlight.abort();
			this.inFlight = null;
		}
	}

	/** Sends the request for the active mode, unless the answer is on screen. */
	private run(): void {
		if (this.mode !== 'analyse' && this.mode !== 'rewrite') return;
		const mode: ReviewMode = this.mode;
		const text = this.view.text();
		if (text.trim() === '') return;

		const key = mode === 'analyse' ? this.analyseKeyFor(text) : this.rewriteKeyFor(text);
		if (mode === 'analyse' && key === this.analyseKey && this.analysis !== null) return;
		if (mode === 'rewrite' && key === this.rewriteKey && this.rewrite !== null) return;

		this.cancel();
		const controller = new AbortController();
		this.inFlight = controller;

		if (mode === 'analyse') {
			this.view.showAnalysisBusy();
			this.view.setActions('analyse', false);
			void this.service.analyse({
				language: this.state.target,
				explanationLanguage: this.state.source,
				text,
				checks: [...this.checks]
			}, controller.signal)
				.then((result) => {
					if (this.inFlight !== controller || this.mode !== 'analyse') return;
					this.inFlight = null;
					this.analysis = result;
					this.analyseKey = key;
					this.view.showAnalysis(text, result);
				})
				.catch((error: unknown) => this.fail(error, controller, mode, 'check'));
			return;
		}

		this.view.showRewriteBusy();
		this.view.setActions('rewrite', false);
		void this.service.rewrite({
			language: this.state.target,
			text,
			style: this.style
		}, controller.signal)
			.then((result) => {
				if (this.inFlight !== controller || this.mode !== 'rewrite') return;
				this.inFlight = null;
				this.rewrite = result;
				this.rewriteKey = key;
				this.view.showRewrite(result);
			})
			.catch((error: unknown) => this.fail(error, controller, mode, 'rewrite'));
	}

	private fail(error: unknown, controller: AbortController, mode: ReviewMode, action: 'check' | 'rewrite'): void {
		if (controller.signal.aborted || this.inFlight !== controller || this.mode !== mode) return;
		this.inFlight = null;

		const message = error instanceof ReviewError
			? error.message
			: `Something went wrong while ${action === 'check' ? 'checking' : 'rewriting'}.`;

		if (mode === 'analyse') {
			this.analysis = null;
			this.analyseKey = null;
			this.view.showAnalysisError(message);
		} else {
			this.rewrite = null;
			this.rewriteKey = null;
			this.view.showRewriteError(message);
		}
	}

	private analyseKeyFor(text: string): string {
		return [this.state.target, this.state.source, [...this.checks].sort().join(','), text].join('\u0000');
	}

	private rewriteKeyFor(text: string): string {
		return [this.state.target, this.style ?? '', text].join('\u0000');
	}

	/* ---------- Explanations ---------- */

	private stepIssue(direction: 1 | -1): void {
		const total = this.view.issueCount;
		if (total === 0) return;
		const current = this.view.selectedIssue;
		const next = direction === 1
			? (current >= total ? 1 : current + 1)
			: (current <= 1 ? total : current - 1);
		this.view.selectIssue(next);
	}

	/* ---------- Copy and speech ---------- */

	private copyText(mode: ReviewMode): void {
		const text = mode === 'analyse'
			? this.analysis?.correctedText ?? ''
			: this.rewrite?.text ?? '';
		if (text === '') return;

		void this.clipboard.write(text).then((copied) => {
			this.toast.show(copied
				? (mode === 'analyse' ? 'Corrected text copied' : 'Rewrite copied')
				: 'Could not copy');
			if (!copied) return;

			const button = mode === 'analyse' ? this.view.analyseCopy : this.view.rewriteCopy;
			button.innerHTML = ICON_DONE;
			setTimeout(() => { button.innerHTML = this.copyIconHtml[mode]; }, 1200);
		});
	}

	private toggleSpeech(mode: ReviewMode): void {
		if (this.speaking === mode) {
			this.stopSpeech();
			return;
		}
		if (!this.speech.supported) {
			this.toast.show('This browser cannot read text aloud');
			return;
		}

		const text = mode === 'analyse'
			? this.analysis?.correctedText ?? ''
			: this.rewrite?.text ?? '';
		if (text === '') return;

		const language = this.catalog.language(this.state.target);
		if (!this.speech.hasVoice(language)) {
			this.toast.show(`No offline ${language.name} voice on this device`);
			return;
		}

		this.stopSpeech();
		this.speaking = mode;
		this.view.setSpeaking(mode, true);
		this.speech.speak(text, language, () => this.stopSpeech());
	}

	private stopSpeech(): void {
		if (this.speaking === null) return;
		this.speech.cancel();
		this.view.setSpeaking(this.speaking, false);
		this.speaking = null;
	}

	/* ---------- Labels and persistence ---------- */

	private renderLanguages(): void {
		if (this.mode !== 'analyse' && this.mode !== 'rewrite') return;
		const target = this.catalog.language(this.state.target);
		const explanation = this.catalog.language(this.state.source === AUTO_CODE ? 'en' : this.state.source);
		this.view.renderLanguages(this.mode, target, this.state.target, explanation);
	}

	private save(): void {
		writeStorage(window.localStorage, REVIEW_STORE_KEY, JSON.stringify({
			text: this.view.text(),
			style: this.style
		}));
	}

	private restore(): void {
		const raw = readStorage(window.localStorage, REVIEW_STORE_KEY);
		if (raw === null) return;

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return;
		}
		if (parsed === null || typeof parsed !== 'object') return;

		const saved = parsed as Record<string, unknown>;
		const text = saved['text'];
		if (typeof text === 'string') this.view.setText(text);

		const style = saved['style'];
		if (isRewriteStyle(style)) this.style = style;
	}
}

function requireButton(id: string): HTMLButtonElement {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Expected an element with id "${id}"`);
	return element as HTMLButtonElement;
}
