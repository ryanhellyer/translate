/**
 * Works out which status code and which URL the visitor was denied.
 *
 * The router in public/index.php serves the error template for any path other
 * than "/", but the status code reaches the browser separately, in order of
 * preference:
 *
 *   1. ?code=404  (or ?status=404) in the query string
 *   2. #404 in the fragment
 *   3. a same-origin cookie named "error_code" (e.g. set by nginx error_page,
 *      or by an upstream 5xx pass-through)
 *   4. Referer / original URL guessing, for hosts that keep the old path
 *      in a redirect fragment or query
 *
 * Anything unrecognised falls back to a plain 404 - the one error every site
 * can be relied upon to produce.
 */

export interface ErrorReport {
	readonly code: number;
	readonly target: string | null;
}

export class ErrorDetector {
	private readonly location: Location;
	private readonly cookie: string;
	private readonly referrer: string;

	constructor(
		location: Location = window.location,
		cookie: string = document.cookie,
		referrer: string = document.referrer
	) {
		this.location = location;
		this.cookie = cookie;
		this.referrer = referrer;
	}

	get referrerUrl(): string {
		return this.referrer;
	}

	detect(): ErrorReport {
		const params = new URLSearchParams(this.location.search || '');

		const code = this.validCode(params.get('code'))
			?? this.validCode(params.get('status'))
			?? this.validCode(params.get('err'))
			?? this.validCode(this.readCookie('error_code'))
			?? this.validCode((this.location.hash || '').replace(/^#\/?/, ''));

		let target = this.readTarget(this.location.search, this.location.hash);

		/* The router serves the error page at the requested path, so if
		   nothing else identified it, the path we are on is the request
		   that went wrong - unless we are somehow on the root. */
		if (!target && this.location.pathname && this.location.pathname !== '/') {
			target = this.location.pathname + this.location.search;
		}

		return { code: code ?? 404, target };
	}

	private validCode(value: string | null): number | null {
		const code = parseInt(value ?? '', 10);
		return code >= 400 && code <= 599 ? code : null;
	}

	private readCookie(name: string): string | null {
		const parts = (` ${this.cookie}`).split(`; ${name}=`);
		if (parts.length < 2) return null;
		const value = parts.pop()?.split(';').shift();
		if (value === undefined) return null;
		try {
			return decodeURIComponent(value);
		} catch {
			return null;
		}
	}

	/* Paths inside the fragment (some hosts redirect to /#/old/path)
	   and the ?url= / ?path= / ?from= query keys all count as "requested". */
	private readTarget(search: string, hash: string): string | null {
		const params = new URLSearchParams(search || '');
		for (const key of ['url', 'path', 'from', 'uri', 'requested']) {
			const value = params.get(key);
			if (value) return value;
		}
		const fragment = (hash || '').replace(/^#\/?/, '');
		if (fragment && !/^\d{3}$/.test(fragment)) return `/${fragment}`;
		return null;
	}
}
