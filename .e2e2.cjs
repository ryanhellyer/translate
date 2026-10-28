/** Exercises language change, swap and style change re-translating live. */
const { chromium } = require('playwright');
const API = 'https://ai.hellyer.test';

(async () => {
	const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
	const page = await browser.newPage();

	await page.route(`${API}/**`, async (route) => {
		const request = route.request();
		const origin = request.headers()['origin'] || '*';
		const headers = {
			'access-control-allow-origin': origin,
			'access-control-allow-methods': 'POST, OPTIONS',
			'access-control-allow-headers': 'content-type',
			vary: 'Origin'
		};
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
		const response = await route.fetch({ ignoreHTTPSErrors: true });
		await route.fulfill({ status: response.status(), headers, body: await response.body() });
	});

	page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

	const readOut = () => page.evaluate(() => {
		const out = document.querySelector('.panel.target .translation');
		return out.textContent;
	});
	const settle = () => page.waitForFunction(
		() => !document.querySelector('.translator-card').classList.contains('is-translating'),
		{ timeout: 30000 });

	await page.goto('http://127.0.0.1:8099/', { waitUntil: 'load' });
	await settle();
	console.log('initial          :', await readOut());

	await page.fill('.panel.source textarea', 'Good morning, how are you?');
	await settle();
	console.log('typed en->de     :', await readOut());

	// Switch target to French.
	await page.click('#target-select');
	await page.fill('#target-menu input', 'french');
	await page.click('#target-menu .lang-option');
	await settle();
	console.log('target=fr        :', await readOut());

	// Style change.
	await page.click('.style-option[data-style="informal"]');
	await settle();
	console.log('style=informal   :', await readOut());

	// Swap.
	await page.click('#swap-btn');
	await settle();
	console.log('after swap       :', await readOut());

	await browser.close();
})();
