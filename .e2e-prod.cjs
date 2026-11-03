/**
 * Checks the app against the real production API, with no shims, to show the
 * actual browser behaviour on translate.hellyer.kiwi.
 */
const { chromium } = require('playwright');

(async () => {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();

	page.on('console', (m) => {
		if (m.type() === 'error') console.log('CONSOLE', m.text());
	});
	page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

	await page.goto('https://translate.hellyer.kiwi/', { waitUntil: 'load' });
	await page.waitForTimeout(1500);

	const base = await page.evaluate(() =>
		document.querySelector('.translator-card')?.getAttribute('data-api-base'));

	await page.fill('.panel.source textarea', 'Please send me the report when you have finished it.');
	await page.click('.style-option[data-style="formal"]');
	await page.waitForFunction(
		() => !document.querySelector('.translator-card').classList.contains('is-translating'),
		{ timeout: 30000 }
	).catch(() => {});

	const result = await page.evaluate(() => {
		const out = document.querySelector('.panel.target .translation');
		return { text: out.textContent, isError: out.classList.contains('is-error') };
	});
	console.log('API base :', base);
	console.log('RESULT   :', JSON.stringify(result));

	await browser.close();
})();
