/**
 * Reading translations aloud.
 *
 * Uses the browser's own speechSynthesis, fed by the OS speech engine. Only
 * voices the browser reports as local are used, so text is never sent to a
 * remote service to generate audio.
 */

import type { Language } from './languages.js';

export class SpeechService {
	private utterance: SpeechSynthesisUtterance | null = null;

	get supported(): boolean {
		return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
	}

	/** Reads `text` in `language`, reporting completion through `onEnd`. */
	speak(text: string, language: Language, onEnd: () => void): void {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.voice = this.pickVoice(language.tag);
		utterance.lang = language.tag;
		utterance.onend = onEnd;
		utterance.onerror = onEnd;

		this.utterance = utterance;
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utterance);
	}

	cancel(): void {
		if (!this.supported) return;
		this.utterance = null;
		window.speechSynthesis.cancel();
	}

	/** Whether the chosen language has an offline voice on this device. */
	hasVoice(language: Language): boolean {
		return this.pickVoice(language.tag) !== null;
	}

	/**
	 * Voices can load asynchronously; a warm-up read keeps them ready.
	 */
	prime(): void {
		if (!this.supported) return;
		window.speechSynthesis.getVoices();
		window.speechSynthesis.addEventListener('voiceschanged', () => {
			window.speechSynthesis.getVoices();
		});
	}

	private pickVoice(tag: string): SpeechSynthesisVoice | null {
		const wanted = tag.toLowerCase();
		const base = wanted.split('-')[0] ?? wanted;
		let best: SpeechSynthesisVoice | null = null;
		let bestRank = 0;

		for (const voice of window.speechSynthesis.getVoices()) {
			/* voice.localService === false means a cloud voice (e.g. Chrome's
			   "Google" voices); exclude those. */
			if (voice.localService === false) continue;

			const lang = voice.lang.toLowerCase();
			let rank = 0;
			if (lang === wanted) rank = voice.default ? 4 : 3;
			else if (lang.split('-')[0] === base) rank = voice.default ? 2 : 1;

			if (rank > bestRank) {
				best = voice;
				bestRank = rank;
			}
		}
		return best;
	}
}

/* If the user navigates away mid-sentence, take the voice with us. */
window.addEventListener('pagehide', () => {
	if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});
