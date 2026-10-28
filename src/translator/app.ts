/**
 * Starts the translator card, if the page has one.
 */

import { container } from 'tsyringe';

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

		TranslatorApp.register(TranslatorApp.apiBase());
		const controller = container.resolve(TranslatorController);
		controller.init();
		return controller;
	}

	/**
	 * The API base URL. The template can override it with a data-api-base
	 * attribute on the translator card, so the same bundle can point at the
	 * local dev API or the production one without a rebuild.
	 */
	private static apiBase(): string {
		const card = document.querySelector<HTMLElement>('.translator-card');
		const configured = card?.getAttribute('data-api-base') ?? '';
		return configured !== '' ? configured : DEFAULT_API_BASE;
	}

	/**
	 * Registers the injectable building blocks. Kept separate from start-up so
	 * tests can swap any of them for a fake before resolving the controller.
	 */
	static register(apiBase: string = DEFAULT_API_BASE): void {
		container.registerSingleton(TranslatorView);
		container.registerSingleton(LanguageCatalog);
		container.registerSingleton(StorageService);
		container.registerSingleton(Clipboard);
		container.registerSingleton(SpeechService);
		container.registerSingleton(Toast);
		container.registerInstance(TranslationService, new TranslationService(apiBase));
	}
}
