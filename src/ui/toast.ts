/**
 * The transient status message at the bottom of the page. Announces itself
 * through role="status" / aria-live, so it is useful to screen readers too.
 */

import { requireElementById } from './dom.js';

export class Toast {
	private readonly element: HTMLElement;
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor(element: HTMLElement = requireElementById<HTMLElement>('toast')) {
		this.element = element;
	}

	show(message: string, duration = 2600): void {
		this.element.textContent = message;
		this.element.classList.add('visible');
		if (this.timer !== null) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.element.classList.remove('visible');
			this.timer = null;
		}, duration);
	}
}
