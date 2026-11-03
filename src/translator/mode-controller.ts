/**
 * The Translate / Analyse / Rewrite switch.
 *
 * It only moves a `data-mode` attribute on the card: the stylesheet decides
 * which parts of the card are visible, and the two controllers are told
 * whether they are the active one. The choice is remembered so a visitor
 * returns to the mode they were last using.
 */

import { readStorage, requireElement, writeStorage } from '../ui/dom.js';

export const MODES = ['translate', 'analyse', 'rewrite'] as const;
export type Mode = (typeof MODES)[number];

const MODE_STORE_KEY = 'translate-mode';

export function isMode(value: unknown): value is Mode {
	return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

export class ModeController {
	readonly card: HTMLElement;
	private readonly buttons: HTMLButtonElement[];
	private readonly listeners: ((mode: Mode) => void)[] = [];
	private mode: Mode = 'translate';

	constructor(card: HTMLElement = requireElement<HTMLElement>('.translator-card')) {
		this.card = card;
		this.buttons = [...card.querySelectorAll<HTMLButtonElement>('.mode-option[data-mode]')];
	}

	/** The stored choice, defaulting to Translate. */
	static stored(): Mode {
		const value = readStorage(window.localStorage, MODE_STORE_KEY);
		return isMode(value) ? value : 'translate';
	}

	/** Applies the stored mode and wires the buttons; returns that mode. */
	init(): Mode {
		this.apply(ModeController.stored());
		for (const button of this.buttons) {
			button.addEventListener('click', () => {
				const mode = button.dataset['mode'];
				if (isMode(mode)) this.setMode(mode);
			});
		}
		return this.mode;
	}

	get current(): Mode {
		return this.mode;
	}

	onChange(listener: (mode: Mode) => void): void {
		this.listeners.push(listener);
	}

	setMode(mode: Mode): void {
		if (mode === this.mode) return;
		this.apply(mode);
		for (const listener of this.listeners) listener(mode);
	}

	private apply(mode: Mode): void {
		this.mode = mode;
		this.card.dataset['mode'] = mode;
		writeStorage(window.localStorage, MODE_STORE_KEY, mode);

		for (const button of this.buttons) {
			const active = button.dataset['mode'] === mode;
			button.classList.toggle('is-active', active);
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		}
	}
}
