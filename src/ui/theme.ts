/**
 * Theme toggle: browser default until clicked, then the choice sticks.
 *
 * Shared by every template. Most of the work happens synchronously at start-up
 * so the page never flashes the wrong theme; templates also carry a small
 * inline script that sets the attribute even earlier.
 */

import { readStorage, requireElementById, writeStorage, type ThemeName } from './dom.js';

const THEME_STORE_KEY = 'translate-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isTheme(value: string | null): value is ThemeName {
	return value === 'light' || value === 'dark';
}

export class ThemeController {
	private readonly root: HTMLElement;
	private readonly toggle: HTMLButtonElement;
	private readonly media: MediaQueryList;

	constructor(
		root: HTMLElement = document.documentElement,
		toggle: HTMLButtonElement = requireElementById<HTMLButtonElement>('theme-toggle'),
		media: MediaQueryList = window.matchMedia(DARK_QUERY)
	) {
		this.root = root;
		this.toggle = toggle;
		this.media = media;
	}

	/** Starts the controller unless the page has no toggle (nothing to wire). */
	static start(): ThemeController | null {
		if (!document.getElementById('theme-toggle')) return null;
		const controller = new ThemeController();
		controller.init();
		return controller;
	}

	init(): void {
		this.applyStoredChoice();
		this.toggle.addEventListener('click', () => this.chooseNext());
		/* Follow the OS while the visitor has never picked a theme. */
		this.media.addEventListener('change', (event) => {
			if (this.storedChoice() === null) {
				this.setTheme(event.matches ? 'dark' : 'light');
			}
		});
		this.updateLabel();
	}

	private get current(): ThemeName {
		return this.root.dataset.theme === 'dark' ? 'dark' : 'light';
	}

	private get next(): ThemeName {
		return this.current === 'dark' ? 'light' : 'dark';
	}

	private storedChoice(): ThemeName | null {
		const stored = readStorage(window.localStorage, THEME_STORE_KEY);
		return isTheme(stored) ? stored : null;
	}

	private applyStoredChoice(): void {
		const stored = this.storedChoice() ?? (this.media.matches ? 'dark' : 'light');
		this.root.dataset.theme = stored;
	}

	private chooseNext(): void {
		const next = this.next;
		this.setTheme(next);
		writeStorage(window.localStorage, THEME_STORE_KEY, next);
	}

	private setTheme(theme: ThemeName): void {
		this.root.dataset.theme = theme;
		this.updateLabel();
	}

	private updateLabel(): void {
		this.toggle.setAttribute('aria-label', `Switch to ${this.next} theme`);
	}
}
