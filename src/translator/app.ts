/**
 * Starts the translator card, if the page has one.
 *
 * This is the composition root: every dependency is built here and passed to
 * the controller. The graph is small and has one composition root, so a
 * dependency-injection container would add a runtime and decorator metadata
 * for no benefit; constructor injection is enough.
 *
 * The card has three modes. Translate is the existing translator; Analyse and
 * Rewrite share the learner's own text and an AI call to the proofreading
 * endpoints (see review-service.ts). The mode switch decides which controller
 * is awake, and the shared language pair lives in one state object.
 */

import { Clipboard } from '../ui/clipboard.js';
import { Toast } from '../ui/toast.js';
import { LanguageCatalog } from './language-catalog.js';
import { ModeController } from './mode-controller.js';
import { ReviewController } from './review-controller.js';
import { ReviewService } from './review-service.js';
import { ReviewView } from './review-view.js';
import { SpeechService } from './speech-service.js';
import { StorageService } from './storage-service.js';
import { DEFAULT_API_BASE, TranslationService } from './translation-service.js';
import { TranslatorController } from './translator-controller.js';
import { TranslatorView } from './translator-view.js';
import { createDefaultState } from './translator-state.js';

export class TranslatorApp {
	static startIfPresent(): TranslatorController | null {
		if (!TranslatorView.exists()) return null;

		const base = TranslatorApp.apiBase();
		const state = createDefaultState();
		const storage = new StorageService();
		const saved = storage.restore(state);

		const catalog = new LanguageCatalog();
		const clipboard = new Clipboard();
		const speech = new SpeechService();
		const toast = new Toast();

		/* The stored mode is applied before the controllers start, so a page
		   that opens in Analyse does not translate first. */
		const mode = new ModeController();
		const initial = mode.init();

		const view = new TranslatorView();
		const translator = new TranslatorController(
			view,
			catalog,
			storage,
			clipboard,
			speech,
			toast,
			new TranslationService(base),
			state
		);
		translator.init(saved, initial === 'translate');

		const review = new ReviewController(
			new ReviewView(),
			new ReviewService(base),
			catalog,
			state,
			clipboard,
			speech,
			toast,
			() => translator.languagesChanged()
		);
		review.init();
		review.setMode(initial);

		mode.onChange((next) => {
			translator.setActive(next === 'translate');
			review.setMode(next);
		});

		return translator;
	}

	/**
	 * The API base URL. The template can override it with a data-api-base
	 * attribute on the translator card, so the same build can point at the
	 * local dev API or the production one without rebuilding.
	 */
	private static apiBase(): string {
		const card = document.querySelector<HTMLElement>('.translator-card');
		const configured = card?.getAttribute('data-api-base') ?? '';
		return configured !== '' ? configured : DEFAULT_API_BASE;
	}
}
