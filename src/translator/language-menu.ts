/**
 * One language pulldown: a search box plus a scrollable list of languages.
 *
 * Built once per side at start-up, then re-filtered as the visitor types.
 * Markup is created in code because the list is far too long to repeat in
 * the template, and the active language needs a class of its own.
 */

import { ICON_CHECK, ICON_CLEAR, ICON_SEARCH } from '../ui/icons.js';
import { requireElementById } from '../ui/dom.js';
import type { LanguageCatalog } from './language-catalog.js';
import type { LanguageCode, Side } from './languages.js';

export interface LanguageMenuCallbacks {
	isActive(code: LanguageCode): boolean;
	onSelect(code: LanguageCode): void;
}

export class LanguageMenu {
	private readonly side: Side;
	private readonly catalog: LanguageCatalog;
	private readonly callbacks: LanguageMenuCallbacks;

	private readonly menu: HTMLElement;
	private readonly button: HTMLElement;
	private readonly input: HTMLInputElement;
	private readonly clearButton: HTMLButtonElement;
	private readonly options: HTMLElement;

	constructor(side: Side, catalog: LanguageCatalog, callbacks: LanguageMenuCallbacks) {
		this.side = side;
		this.catalog = catalog;
		this.callbacks = callbacks;

		this.menu = requireElementById<HTMLElement>(`${side}-menu`);
		this.button = requireElementById<HTMLElement>(`${side}-select`);

		const panel = document.createElement('div');
		panel.className = 'lang-search';
		panel.innerHTML = ICON_SEARCH;

		this.input = document.createElement('input');
		this.input.type = 'text';
		this.input.id = `${side}-search`;
		this.input.className = 'lang-search-input';
		this.input.placeholder = 'Search languages';
		this.input.setAttribute('aria-label', `Search ${side} languages`);
		this.input.setAttribute('autocomplete', 'off');
		this.input.setAttribute('spellcheck', 'false');

		this.clearButton = document.createElement('button');
		this.clearButton.type = 'button';
		this.clearButton.className = 'lang-search-clear';
		this.clearButton.setAttribute('aria-label', 'Clear search');
		this.clearButton.innerHTML = ICON_CLEAR;
		this.clearButton.hidden = true;

		this.options = document.createElement('div');
		this.options.className = 'lang-options';
		this.options.id = `${side}-options`;

		panel.append(this.input, this.clearButton);
		this.menu.replaceChildren(panel, this.options);

		this.wireEvents();
		this.fill('');
	}

	/** Rebuilds the list, e.g. after the pair changes so the tick moves. */
	refresh(): void {
		this.fill(this.input.value);
	}

	get isOpen(): boolean {
		return !this.menu.hidden;
	}

	open(): void {
		this.menu.hidden = false;
		this.button.setAttribute('aria-expanded', 'true');
		this.input.value = '';
		this.clearButton.hidden = true;
		this.fill('');
		this.input.focus();
	}

	close(): void {
		if (!this.isOpen && this.button.getAttribute('aria-expanded') !== 'true') return;
		this.menu.hidden = true;
		this.button.setAttribute('aria-expanded', 'false');
	}

	private wireEvents(): void {
		this.input.addEventListener('input', () => {
			this.clearButton.hidden = this.input.value === '';
			this.fill(this.input.value);
		});

		this.input.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter') return;
			const first = this.options.querySelector<HTMLElement>('.lang-option');
			const code = first?.dataset['lang'];
			if (first && code) {
				event.preventDefault();
				this.callbacks.onSelect(code);
			}
		});

		this.clearButton.addEventListener('click', () => {
			this.input.value = '';
			this.clearButton.hidden = true;
			this.fill('');
			this.input.focus();
		});
	}

	private fill(query: string): void {
		const codes = this.catalog.codesFor(this.side, query);

		if (codes.length === 0) {
			const empty = document.createElement('p');
			empty.className = 'lang-empty';
			empty.textContent = 'No languages found';
			this.options.replaceChildren(empty);
			return;
		}

		this.options.replaceChildren(
			...codes.map((code) => this.createOption(code))
		);
	}

	private createOption(code: LanguageCode): HTMLButtonElement {
		const entry = this.catalog.language(code);
		const option = document.createElement('button');
		option.type = 'button';
		option.className = 'lang-option' + (this.callbacks.isActive(code) ? ' is-active' : '');
		option.dataset['lang'] = code;

		const name = document.createElement('span');
		name.className = 'opt-name';
		name.textContent = entry.name;

		const nativeName = document.createElement('span');
		nativeName.className = 'opt-native';
		nativeName.textContent = entry.native;

		const check = document.createElement('span');
		check.className = 'opt-check';
		check.innerHTML = ICON_CHECK;

		option.append(name, nativeName, check);
		option.addEventListener('click', () => this.callbacks.onSelect(code));
		return option;
	}
}
