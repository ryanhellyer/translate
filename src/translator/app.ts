/**
 * Starts the translator card, if the page has one.
 *
 * This is the composition root: every dependency is built here and passed to
 * the controller. The graph is small and has one composition root, so a
 * dependency-injection container would add a runtime and decorator metadata
 * for no benefit; constructor injection is enough.
 */

import { Clipboard } from '../ui/clipboard.js';
import { Toast } from '../ui/toast.js';
import { LanguageCatalog } from './language-catalog.js';
import { SpeechService } from './speech-service.js';
import { StorageService } from './storage-service.js';
import { DEFAULT_API_BASE, TranslationService } from './translation-service.js';
import { TranslatorController } from './translator-controller.js';
import { TranslatorView } from './translator-view.js';

export class TranslatorApp {
	static startIfPresent(): TranslatorController | null {
		if (!TranslatorView.exists()) return null;

		const view = new TranslatorView();
		const catalog = new LanguageCatalog();
		const storage = new StorageService();
		const clipboard = new Clipboard();
		const speech = new SpeechService();
		const toast = new Toast();
		const translations = new TranslationService(TranslatorApp.apiBase());

		const controller = new TranslatorController(
			view,
			catalog,
			storage,
			clipboard,
			speech,
			toast,
			translations
		);
		controller.init();
		return controller;
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
