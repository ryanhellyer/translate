/**
 * Loads the LOCAL app build and lets it call the REAL production API with no
 * shim, to isolate whether the API's CORS headers are the only blocker.
 *
 * Serves the app on a local port, then points its card at ai.hellyer.kiwi.
 */
const { chromium } = require('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:8099/';
const API = process.env.API_BASE || 'https://ai.hellyer.kiwi';

(async () => {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
	page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

	await page.goto(APP, { waitUntil: 'load' });

	// Force the API origin this run is testing, then reload so the app reads it.
	await page.evaluate((api) => {
		document.querySelector('.translator-card').setAttribute('data-api-base', api);
	}, API);
	await page.reload({ waitUntil: 'load' });

	await page.fill('.panel.source textarea', 'Please send me the report when you have finished it.');
	await page.waitForFunction(
		() => !document.querySelector('.translator-card').classList.contains('is-translating'),
		{ timeout: 30000 }
	).catch(() => {});

	const r = await page.evaluate(() => {
		const out = document.querySelector('.panel.target .translation');
		return {
			base: document.querySelector('.translator-card').getAttribute('data-api-base'),
			text: out.textContent,
			isError: out.classList.contains('is-error')
		};
	});
	console.log('RESULT', JSON.stringify(r, null, 2));
	await browser.close();
})();
