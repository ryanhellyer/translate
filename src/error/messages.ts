/**
 * Error copy for every status code the site is prepared to explain, plus a
 * generic fallback for anything else.
 */

export interface ErrorCopy {
	readonly category: string;
	readonly title: string;
	readonly joke: string;
	readonly advice: string;
}

export const MESSAGES: Readonly<Record<number, ErrorCopy>> = {
	400: {
		category: 'Bad Request',
		title: 'We couldn\u2019t parse that.',
		joke: 'The browser asked for something in a language this server doesn\u2019t speak. Grammar, mostly.',
		advice: 'Check the address for stray characters, half-finished query strings, or a copy-paste that lost a limb on the way over.'
	},
	401: {
		category: 'Unauthorized',
		title: 'You shall not pass.',
		joke: 'This page wants a password, and frankly it\u2019s being dramatic about it.',
		advice: 'Sign in first, then knock again. If you were already signed in, your session has quietly wandered off.'
	},
	403: {
		category: 'Forbidden',
		title: 'Nothing to see here.',
		joke: 'The page exists. It just doesn\u2019t want to be seen with you. It\u2019s not personal, it\u2019s policy.',
		advice: 'If you\u2019re certain you should have access, ask whoever controls the keys. Politely. With cake.'
	},
	404: {
		category: 'Not Found',
		title: 'This page is lost in translation.',
		joke: 'The address you asked for doesn\u2019t exist here. We looked. We even checked behind the sofa.',
		advice: 'It may have been moved, renamed, or never existed in the first place \u2014 which, in fairness, is a lot to expect from a design mock-up.'
	},
	405: {
		category: 'Method Not Allowed',
		title: 'Wrong verb.',
		joke: 'You knocked with the wrong hand. This page accepts one kind of request and you brought another.',
		advice: 'This is almost always a form or a fetch call doing something the server didn\u2019t agree to.'
	},
	408: {
		category: 'Request Timeout',
		title: 'The server dozed off.',
		joke: 'Your request took so long to finish its sentence that everyone stopped waiting.',
		advice: 'Check your connection and try again. Slower sites are a thing; vanished ones usually aren\u2019t.'
	},
	410: {
		category: 'Gone',
		title: 'Gone. Properly gone.',
		joke: 'This page didn\u2019t move, it left. No forwarding address, no note, just a dramatic exit.',
		advice: 'Unlike a 404, this one isn\u2019t coming back. Try the home page and start over.'
	},
	418: {
		category: 'I\u2019m a Teapot',
		title: 'I\u2019m a teapot.',
		joke: 'You asked a teapot to brew coffee. The teapot is short, stout, and not in the coffee business.',
		advice: 'This status code is a genuine joke from 1998 that refuses to die. There is nothing to fix; enjoy it.'
	},
	429: {
		category: 'Too Many Requests',
		title: 'Slow down there.',
		joke: 'You knocked a lot of times in a very short window. The door noticed, and mildly objected.',
		advice: 'Wait a moment and try again. Automated tools may want to add a delay between requests.'
	},
	451: {
		category: 'Unavailable For Legal Reasons',
		title: 'Unavailable for legal reasons.',
		joke: 'This page has been redacted by someone with a lawyer and a red pen.',
		advice: 'Nothing to retry here \u2014 the restriction is deliberate. Ask the site owner if you need the details.'
	},
	500: {
		category: 'Internal Server Error',
		title: 'The server tripped over its own shoelaces.',
		joke: 'Something broke on our side. It isn\u2019t you. It\u2019s almost never you.',
		advice: 'This one is entirely our fault. Give it a minute and try again \u2014 it may already be fixed.'
	},
	501: {
		category: 'Not Implemented',
		title: 'We never built that bit.',
		joke: 'The server understood the request and has decided, permanently, not to have implemented it.',
		advice: 'No amount of reloading will help. The feature simply isn\u2019t there.'
	},
	502: {
		category: 'Bad Gateway',
		title: 'The middleman dropped it.',
		joke: 'Our gateway asked the server behind it a question and got nonsense back. Rude.',
		advice: 'Usually brief. Reload in a moment; if it sticks around, it\u2019s on our end.'
	},
	503: {
		category: 'Service Unavailable',
		title: 'Taking a nap.',
		joke: 'The site is up but the bit that does the actual work is having a lie-down.',
		advice: 'This is normally a restart, a deploy, or far too much traffic. Try again shortly.'
	},
	504: {
		category: 'Gateway Timeout',
		title: 'We gave up waiting.',
		joke: 'Our gateway waited for the server behind it, then got bored and left the room.',
		advice: 'Reload in a moment. If it keeps timing out, the API behind this page is the thing to check.'
	},
	505: {
		category: 'HTTP Version Not Supported',
		title: 'Speaking a dialect we don\u2019t.',
		joke: 'Your browser requested a version of HTTP this server has never heard of.',
		advice: 'Try a current browser; if you\u2019re writing a client by hand, dial the version down.'
	},
	507: {
		category: 'Insufficient Storage',
		title: 'Run out of room.',
		joke: 'The server tried to write something down and there was no paper left.',
		advice: 'Almost always a disk that needs emptying. Nothing you can do from here except wait.'
	}
};

export const GENERIC: ErrorCopy = {
	category: 'Something Went Wrong',
	title: 'Something went wrong.',
	joke: 'The server tried its best and its best wasn\u2019t quite enough.',
	advice: 'Try again in a moment. If the problem persists, it\u2019s probably not going away on its own.'
};

/** Fallback categories, so an unknown code still reads sensibly. */
export function categoryFor(code: number): string {
	if (code >= 400 && code < 500) return 'Client Error';
	if (code >= 500 && code < 600) return 'Server Error';
	return GENERIC.category;
}
