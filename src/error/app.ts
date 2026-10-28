/**
 * Starts the error card, if the page has one.
 *
 * Only runs on the error template, so the bundle can be shared by every page.
 */

import { ErrorPage } from './error-page.js';

export class ErrorPageApp {
	static startIfPresent(): ErrorPage | null {
		if (!ErrorPage.exists()) return null;
		return ErrorPage.start();
	}
}
