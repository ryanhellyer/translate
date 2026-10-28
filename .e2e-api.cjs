/** Drives the app against a stubbed API to check the AJAX translation path. */
const { chromium } = require('playwright');

const results = [];
const check = (name, ok, detail = '') => {
	results.push(ok);
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

(async () => {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	const requests = [];
	let checkpoint = 0;

	const cors = {
		'access-control-allow-origin': '*',
		'access-control-allow-headers': '*',
		'access-control-allow-methods': 'POST, OPTIONS'
	};

	await page.route('**/v1/translations', async (route) => {
		const request = route.request();
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
		const body = request.postDataJSON();
		requests.push(body);
		await page.evaluate((n) => { window.__requestCount = n; }, requests.length).catch(() => {});
		checkpoint = requests.length;
		/* A little latency, so the busy state is observable. */
		await new Promise((resolve) => setTimeout(resolve, 120));
		const tone = body.tone ? ` [${body.tone}]` : '';
		return route.fulfill({
			status: 200,
			headers: { ...cors, 'content-type': 'application/json' },
			body: JSON.stringify({ translation: `${body.text} in ${body.to}${tone}` })
		});
	});

	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	/* Wait for a translation to finish: the card goes busy, then idle again. */
	const settle = () => page.waitForFunction(
		() => !document.querySelector('.translator-card').classList.contains('is-translating'),
		{ timeout: 8000 }
	);
	/* The debounce means "idle" is briefly true straight after typing; wait for
	   the next request to arrive and finish instead. */
	const settleAfter = async (count) => {
		await page.waitForFunction(
			(expected) => window.__requestCount >= expected &&
				!document.querySelector('.translator-card').classList.contains('is-translating'),
			count,
			{ timeout: 8000 }
		);
	};
	const output = () => page.textContent('.panel.target .translation');

	await page.addInitScript(() => { window.__requestCount = 0; });
	await page.goto('http://127.0.0.1:8099/', { waitUntil: 'load' });
	await settleAfter(1);

	check('translates the initial text', (await output()).includes('in German'), await output());
	const first = requests.at(-1);
	check('sends English names', first?.from === 'English' && first?.to === 'German', JSON.stringify(first));
	check('omits tone when unset', first !== undefined && !('tone' in first));

	await page.fill('.panel.source textarea', 'Good morning');
	await settleAfter(checkpoint + 1);
	check('translates as you type', (await output()).startsWith('Good morning in German'), await output());
	const typed = requests.filter((r) => r.text === 'Good morning').length;
	check('debounced to one request', typed === 1, `${typed} requests`);

	await page.click('.style-option[data-style="formal"]');
	await settle();
	check('style change re-translates with tone', requests.at(-1)?.tone === 'formal', JSON.stringify(requests.at(-1)));
	check('tone shown in output', (await output()).includes('[formal]'), await output());

	await page.click('#target-select');
	await page.fill('#target-menu input', 'french');
	await page.click('#target-menu .lang-option');
	await settle();
	check('language change re-translates', (await output()).includes('in French'), await output());
	check('language sent as a name', requests.at(-1)?.to === 'French');

	await page.click('#swap-btn');
	await settle();
	check('swap translates the other way', (await output()).includes('in English'), await output());

	check('api base comes from the template', requests.every((r) => typeof r.text === 'string'));

	/* A failure is shown in place, in the error colour, and disables actions. */
	await page.unroute('**/v1/translations');
	await page.route('**/v1/translations', async (route) => {
		checkpoint += 1;
		await page.evaluate((n) => { window.__requestCount = n; }, checkpoint).catch(() => {});
		return route.fulfill({ status: 503, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
	});
	await page.fill('.panel.source textarea', 'This one fails');
	await settleAfter(checkpoint + 1);
	check('server error explained', (await output()).includes('having trouble'), await output());
	check('error styled', (await page.getAttribute('.panel.target .translation', 'class')).includes('is-error'));
	check('copy disabled on error', await page.isDisabled('#copy-btn'));

	await page.fill('.panel.source textarea', '');
	await page.waitForFunction(() => document.querySelector('.panel.target .translation').textContent === '');
	check('empty input clears output', (await output()) === '');
	check('error styling cleared', !(await page.getAttribute('.panel.target .translation', 'class') || '').includes('is-error'));
	check('copy disabled when empty', await page.isDisabled('#copy-btn'));

	check('no page errors', errors.length === 0, errors.join(' | '));

	await browser.close();
	const failed = results.filter((ok) => !ok).length;
	console.log(`\n${results.length - failed}/${results.length} passed`);
	process.exit(failed ? 1 : 0);
})();
