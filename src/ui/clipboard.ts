/**
 * Copying text, preferring the async clipboard API and falling back to a
 * hidden textarea plus document.execCommand for older or restricted hosts.
 */

export class Clipboard {
	async write(text: string): Promise<boolean> {
		const clipboard = navigator.clipboard;
		if (clipboard && typeof clipboard.writeText === 'function') {
			try {
				await clipboard.writeText(text);
				return true;
			} catch {
				return this.legacyCopy(text);
			}
		}
		return this.legacyCopy(text);
	}

	private legacyCopy(text: string): boolean {
		try {
			const field = document.createElement('textarea');
			field.value = text;
			field.setAttribute('readonly', '');
			field.style.position = 'fixed';
			field.style.opacity = '0';
			document.body.appendChild(field);
			field.select();
			const copied = document.execCommand('copy');
			field.remove();
			return copied;
		} catch {
			return false;
		}
	}
}
