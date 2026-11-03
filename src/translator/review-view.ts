/**
 * The Analyse and Rewrite screens.
 *
 * Both share the left-hand box and the language row; only the output side
 * changes. This class owns that DOM: it paints results, runs the highlight
 * selection, and keeps the status chips and action buttons honest. Requests
 * and debouncing live in review-controller.ts.
 */

import { requireElement, requireElementById } from '../ui/dom.js';
import type { Language } from './languages.js';
import {
	analysisSummary,
	renderableIssues,
	type AnalysisResult,
	type ReviewIssue,
	type ReviewMode,
	type RewriteResult
} from './review-model.js';
import { buildAnnotated, buildChangeList, buildInsight, buildPrompt, buildRewrite } from './review-render.js';

/** Below this width the two boxes stack, like the translator's panels. */
const STACKED_QUERY = '(max-width: 768px)';

type Tone = 'good' | 'needs' | 'suggest' | 'busy' | '';

export class ReviewView {
	readonly input: HTMLTextAreaElement = requireElementById<HTMLTextAreaElement>('review-input');
	readonly counter: HTMLElement = requireElementById<HTMLElement>('review-count');
	readonly clearButton: HTMLButtonElement = requireElementById<HTMLButtonElement>('review-clear');
	readonly languageLabel: HTMLElement = requireElementById<HTMLElement>('review-language');
	readonly explainLabel: HTMLElement = requireElementById<HTMLElement>('review-explain');

	readonly analyseBadge: HTMLElement = requireElementById<HTMLElement>('analyse-badge');
	readonly rewriteBadge: HTMLElement = requireElementById<HTMLElement>('rewrite-badge');
	readonly analyseStatus: HTMLElement = requireElementById<HTMLElement>('analyse-status');
	readonly rewriteStatus: HTMLElement = requireElementById<HTMLElement>('rewrite-status');
	readonly analyseError: HTMLElement = requireElementById<HTMLElement>('analyse-error');
	readonly rewriteError: HTMLElement = requireElementById<HTMLElement>('rewrite-error');
	readonly analyseText: HTMLElement = requireElementById<HTMLElement>('analyse-text');
	readonly rewriteText: HTMLElement = requireElementById<HTMLElement>('rewrite-text');
	readonly rewritePlaceholder: HTMLElement = requireElementById<HTMLElement>('rewrite-placeholder');

	readonly insightBar: HTMLElement = requireElementById<HTMLElement>('insight-bar');
	readonly insightCount: HTMLElement = requireElementById<HTMLElement>('insight-count');
	readonly insightStack: HTMLElement = requireElementById<HTMLElement>('insight-stack');

	readonly changeCard: HTMLElement = requireElementById<HTMLElement>('rewrite-changes');
	readonly changeList: HTMLElement = requireElementById<HTMLElement>('rewrite-change-list');

	readonly analyseView: HTMLElement = requireElement<HTMLElement>('.review-view[data-view="analyse"]');
	readonly rewriteView: HTMLElement = requireElement<HTMLElement>('.review-view[data-view="rewrite"]');

	readonly analyseCopy: HTMLButtonElement = requireElementById<HTMLButtonElement>('analyse-copy');
	readonly analyseListen: HTMLButtonElement = requireElementById<HTMLButtonElement>('analyse-listen');
	readonly rewriteCopy: HTMLButtonElement = requireElementById<HTMLButtonElement>('rewrite-copy');
	readonly rewriteListen: HTMLButtonElement = requireElementById<HTMLButtonElement>('rewrite-listen');

	private issues: readonly ReviewIssue[] = [];
	private selected = 0;

	static exists(): boolean {
		return document.getElementById('review-input') !== null;
	}

	get isStacked(): boolean {
		return window.matchMedia(STACKED_QUERY).matches;
	}

	text(): string {
		return this.input.value;
	}

	/**
	 * Assigning `.value` never fires `input`, so restoring saved text cannot
	 * trigger a request by itself.
	 */
	setText(value: string): void {
		this.input.value = value;
		this.autoSize();
		this.updateCounter();
	}

	updateCounter(): void {
		const length = this.input.value.length;
		this.counter.textContent = `${length.toLocaleString('en-NZ')} / 5,000`;
		this.counter.classList.toggle('warn', length > 4500);
		this.clearButton.hidden = length === 0;
	}

	autoSize(): void {
		if (!this.isStacked) {
			this.input.style.removeProperty('height');
			return;
		}
		if (this.input.getClientRects().length === 0) return;
		this.input.style.height = 'auto';
		this.input.style.height = `${this.input.scrollHeight}px`;
	}

	/** The language row, badges and `lang` attributes follow the pair. */
	renderLanguages(mode: ReviewMode, target: Language, targetCode: string, explanation: Language): void {
		this.languageLabel.textContent = target.name;
		this.explainLabel.textContent = mode === 'rewrite'
			? `Rewritten in ${target.name}`
			: `Explanations in ${explanation.name}`;
		this.analyseBadge.textContent = targetCode.toUpperCase();
		this.rewriteBadge.textContent = targetCode.toUpperCase();

		const tag = target.tag === '' ? '' : target.tag;
		this.input.lang = tag;
		this.analyseText.lang = tag;
		this.rewriteText.lang = tag;
		this.input.setAttribute('aria-label', `Your ${target.name} text`);
	}

	/* ---------- Status ---------- */

	private setStatus(mode: ReviewMode, text: string, tone: Tone): void {
		const chip = mode === 'analyse' ? this.analyseStatus : this.rewriteStatus;
		chip.textContent = text;
		chip.classList.toggle('is-good', tone === 'good');
		chip.classList.toggle('is-needs', tone === 'needs');
		chip.classList.toggle('is-suggest', tone === 'suggest');
		chip.classList.toggle('is-busy', tone === 'busy');
		chip.hidden = text === '';
	}

	private setBusyClass(mode: ReviewMode, busy: boolean): void {
		const view = mode === 'analyse' ? this.analyseView : this.rewriteView;
		view.classList.toggle('is-busy', busy);
	}

	private showError(mode: ReviewMode, message: string | null): void {
		const error = mode === 'analyse' ? this.analyseError : this.rewriteError;
		error.textContent = message ?? '';
		error.hidden = message === null;
	}

	/* ---------- Analyse ---------- */

	showAnalysisEmpty(): void {
		this.issues = [];
		this.selected = 0;
		this.setBusyClass('analyse', false);
		this.showError('analyse', null);
		this.setStatus('analyse', '', '');
		this.analyseText.replaceChildren();
		this.insightBar.hidden = true;
		this.insightStack.replaceChildren(buildPrompt(
			'Write something on the left.',
			'Your text is checked as you type, and every correction is explained.'
		));
		this.setActions('analyse', false);
	}

	showAnalysisBusy(): void {
		this.setBusyClass('analyse', true);
		this.showError('analyse', null);
		this.setStatus('analyse', 'Checking…', 'busy');
	}

	showAnalysisError(message: string): void {
		this.issues = [];
		this.selected = 0;
		this.setBusyClass('analyse', false);
		this.setStatus('analyse', 'Could not check', 'needs');
		this.showError('analyse', message);
		this.analyseText.replaceChildren();
		this.insightBar.hidden = true;
		this.insightStack.replaceChildren();
		this.setActions('analyse', false);
	}

	showAnalysis(text: string, result: AnalysisResult): void {
		this.setBusyClass('analyse', false);
		this.showError('analyse', null);

		this.issues = renderableIssues(result.issues);
		const corrections = this.issues.filter((issue) => issue.severity === 'correction').length;

		this.analyseText.replaceChildren(buildAnnotated(text, this.issues));

		if (this.issues.length === 0) {
			this.setStatus('analyse', analysisSummary(this.issues), 'good');
			this.insightBar.hidden = true;
			this.insightStack.replaceChildren(buildPrompt(
				'No problems found.',
				'Nothing to fix here — nice work.',
				'done'
			));
			this.setActions('analyse', result.correctedText !== null);
			return;
		}

		const tone: Tone = corrections > 0 ? 'needs' : 'suggest';
		this.setStatus('analyse', analysisSummary(this.issues), tone);

		this.insightStack.replaceChildren(
			buildPrompt('Click a highlight', 'to see what went wrong and how to remember it.'),
			...this.issues.map((issue, index) => buildInsight(issue, index))
		);
		this.selectIssue(1);
		this.setActions('analyse', result.correctedText !== null);
	}

	/** Shows one explanation card; 0 closes them and returns to the prompt. */
	selectIssue(index: number): void {
		this.selected = index;

		for (const flag of this.analyseText.querySelectorAll<HTMLElement>('.review-flag')) {
			const on = flag.dataset['issue'] === String(index);
			flag.classList.toggle('is-selected', on);
			flag.setAttribute('aria-expanded', on ? 'true' : 'false');
		}

		const stack = this.insightStack.querySelectorAll<HTMLElement>('.insight');
		stack.forEach((card) => {
			card.hidden = card.dataset['issue'] !== String(index);
		});

		const prompt = this.insightStack.querySelector<HTMLElement>('.review-prompt');
		const found = index > 0 && index <= this.issues.length;
		if (prompt) prompt.hidden = found;
		this.insightBar.hidden = !found;
		if (found) this.insightCount.textContent = `Issue ${index} of ${this.issues.length}`;
	}

	get selectedIssue(): number {
		return this.selected;
	}

	get issueCount(): number {
		return this.issues.length;
	}

	/* ---------- Rewrite ---------- */

	showRewriteEmpty(): void {
		this.setBusyClass('rewrite', false);
		this.showError('rewrite', null);
		this.setStatus('rewrite', '', '');
		this.rewriteText.replaceChildren();
		this.changeCard.hidden = true;
		this.rewritePlaceholder.replaceChildren(buildPrompt(
			'Your rewrite will appear here.',
			'Write something on the left to get a more natural version.'
		));
		this.rewritePlaceholder.hidden = false;
		this.setActions('rewrite', false);
	}

	showRewriteBusy(): void {
		this.setBusyClass('rewrite', true);
		this.showError('rewrite', null);
		this.setStatus('rewrite', 'Rewriting…', 'busy');
	}

	showRewriteError(message: string): void {
		this.setBusyClass('rewrite', false);
		this.setStatus('rewrite', 'Could not rewrite', 'needs');
		this.showError('rewrite', message);
		this.rewriteText.replaceChildren();
		this.changeCard.hidden = true;
		this.rewritePlaceholder.hidden = true;
		this.setActions('rewrite', false);
	}

	showRewrite(result: RewriteResult): void {
		this.setBusyClass('rewrite', false);
		this.showError('rewrite', null);
		this.setStatus('rewrite', 'Rewritten', 'good');

		this.rewritePlaceholder.hidden = true;
		this.rewriteText.replaceChildren(buildRewrite(result.text, result.changes));

		if (result.changes.length > 0) {
			this.changeList.replaceChildren(buildChangeList(result.changes));
			this.changeCard.hidden = false;
		} else {
			this.changeList.replaceChildren();
			this.changeCard.hidden = true;
		}

		this.setActions('rewrite', result.text.trim() !== '');
	}

	/* ---------- Actions ---------- */

	setActions(mode: ReviewMode, enabled: boolean): void {
		const copy = mode === 'analyse' ? this.analyseCopy : this.rewriteCopy;
		const listen = mode === 'analyse' ? this.analyseListen : this.rewriteListen;
		copy.disabled = !enabled;
		listen.disabled = !enabled;
	}

	setSpeaking(mode: ReviewMode, speaking: boolean): void {
		const button = mode === 'analyse' ? this.analyseListen : this.rewriteListen;
		button.classList.toggle('is-speaking', speaking);
		button.setAttribute('aria-pressed', speaking ? 'true' : 'false');
		button.setAttribute(
			'aria-label',
			speaking
				? 'Stop reading'
				: mode === 'analyse' ? 'Read the corrected text aloud' : 'Read the rewrite aloud'
		);
	}

	markUnsupportedSpeech(): void {
		this.analyseListen.setAttribute('aria-label', 'Text reading is not supported in this browser');
		this.rewriteListen.setAttribute('aria-label', 'Text reading is not supported in this browser');
	}
}
