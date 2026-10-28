/**
 * End-to-end check of the live AJAX translation.
 *
 * Runs Chromium with --ignore-certificate-errors so the self-signed dev API
 * at https://ai.hellyer.test is accepted.
 *
 * The dev API sends no CORS headers (they belong on the API, which lives
 * outside this container), so this harness injects the Access-Control-Allow-*
 * headers a correctly configured API would send, via request interception.
 * That isolates the app's own behaviour: if the translation arrives, the
 * app's AJAX path is correct and the only remaining gap is server-side CORS.
 *
 * Set NO_CORS_SHIM=1 to see the raw browser behaviour instead.
 */
const { chromium } = require('playwright');

const SHIM = process.env.NO_CORS_SHIM !== '1';
const API = 'https://ai.hellyer.test';

(async () => {
	const browser = await chromium.launch({
		headless: true,
		args: ['--ignore-certificate-errors']
	});
	const page = await browser.newPage();

	if (SHIM) {
		await page.route(`${API}/**`, async (route) => {
			const request = route.request();
			const origin = request.headers()['origin'] || '*';
			const headers = {
				'access-control-allow-origin': origin,
				'access-control-allow-methods': 'POST, OPTIONS',
				'access-control-allow-headers': 'content-type',
				vary: 'Origin'
			};
			if (request.method() === 'OPTIONS') {
				return route.fulfill({ status: 204, headers, body: '' });
			}
			/* Playwright's own fetch is Node's, which does not inherit the
			   browser's --ignore-certificate-errors; this harness opts out of
			   TLS verification for the shim only. */
			const response = await route.fetch({ ignoreHTTPSErrors: true });
			const body = await response.body();
			await route.fulfill({ status: response.status(), headers, body });
		});
	}

	page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
	page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

	await page.goto('http://127.0.0.1:8099/', { waitUntil: 'load' });

	await page.fill('.panel.source textarea', 'Please send me the report when you have finished it.');
	await page.click('.style-option[data-style="formal"]');

	await page.waitForFunction(
		() => {
			const card = document.querySelector('.translator-card');
			return card && !card.classList.contains('is-translating');
		},
		{ timeout: 30000 }
	).catch(() => console.log('TIMEOUT waiting for translation'));

	const result = await page.evaluate(() => {
		const out = document.querySelector('.panel.target .translation');
		return { text: out.textContent, isError: out.classList.contains('is-error') };
	});
	console.log('RESULT', JSON.stringify(result, null, 2));

	await browser.close();
})();
