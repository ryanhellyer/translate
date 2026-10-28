const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8099';
const results = [];
function check(name, ok, detail = '') {
	results.push({ name, ok });
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

(async () => {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ colorScheme: 'light' });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	page.on('console', (m) => {
		/* Google Fonts cannot be fetched in the offline test sandbox. */
		if (m.type() === 'error' && !/ERR_CERT_AUTHORITY_INVALID/.test(m.text())) errors.push(m.text());
	});

	await page.goto(BASE + '/', { waitUntil: 'networkidle' });

	check('theme initialised', (await page.getAttribute('html', 'data-theme')) === 'light');
	await page.click('#theme-toggle');
	check('theme toggles to dark', (await page.getAttribute('html', 'data-theme')) === 'dark');
	check('theme stored', (await page.evaluate(() => localStorage.getItem('translate-theme'))) === 'dark');
	check('toggle label updated', (await page.getAttribute('#theme-toggle', 'aria-label')) === 'Switch to light theme');

	await page.click('#source-select');
	check('source menu opens', await page.isVisible('#source-menu'));
	const optionCount = await page.locator('#source-menu .lang-option').count();
	check('options rendered', optionCount > 100, `${optionCount} options`);
	check('auto listed for source', (await page.locator('#source-menu .lang-option').first().getAttribute('data-lang')) === 'auto');
	check('active option marked', (await page.locator('#source-menu .lang-option.is-active').first().getAttribute('data-lang')) === 'en');

	await page.fill('#source-search', 'maori');
	await page.waitForTimeout(50);
	check('accent-insensitive search', (await page.locator('#source-menu .lang-option').count()) === 1);
	check('search result is mi', (await page.locator('#source-menu .lang-option').first().getAttribute('data-lang')) === 'mi');

	await page.fill('#source-search', 'zzzzz');
	check('empty state', (await page.textContent('#source-menu .lang-empty')) === 'No languages found');
	await page.click('#source-menu .lang-search-clear');
	await page.keyboard.press('Escape');
	check('escape closes menu', !(await page.isVisible('#source-menu')));

	await page.click('#source-select');
	await page.fill('#source-search', 'german');
	await page.press('#source-search', 'Enter');
	check('selecting the target language swaps sides', (await page.textContent('#source-tabs .lang-tab.from')) === 'German');
	check('previous source moves across', (await page.textContent('#source-tabs .lang-tab.into')) === 'English');

	await page.click('#swap-btn');
	check('swap moves labels', (await page.textContent('#source-tabs .lang-tab.from')) === 'English');
	check('swap moves target', (await page.textContent('#source-tabs .lang-tab.into')) === 'German');
	await page.click('#source-tabs .lang-tab.from');
	check('clicking a tab swaps too', (await page.textContent('#source-tabs .lang-tab.from')) === 'German');

	await page.fill('.panel.source textarea', 'Hello');
	check('counter updates', (await page.textContent('.panel.source .char-count')) === '5 / 5,000');
	check('clear button shown', await page.isVisible('#clear-btn'));
	await page.fill('.panel.source textarea', 'x'.repeat(4600));
	check('counter warns near limit', (await page.getAttribute('.panel.source .char-count', 'class')).includes('warn'));
	await page.evaluate(() => { document.querySelector('.panel.target .translation').textContent = 'Hallo'; });
	await page.fill('.panel.source textarea', '');
	check('empty input clears output', (await page.textContent('.panel.target .translation')) === '');
	check('listen disabled with no output', await page.isDisabled('#listen-btn'));
	check('copy disabled with no output', await page.isDisabled('#copy-btn'));

	await page.click('.style-option[data-style="formal"]');
	check('style pressed', (await page.getAttribute('.style-option[data-style="formal"]', 'aria-pressed')) === 'true');
	await page.click('.style-option[data-style="formal"]');
	check('style toggles off', (await page.getAttribute('.style-option[data-style="formal"]', 'aria-pressed')) === 'false');

	await page.fill('.panel.source textarea', 'Hello again');
	await page.click('#clear-btn');
	check('clear empties textarea', (await page.inputValue('.panel.source textarea')) === '');
	const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('translate-state') || '{}'));
	check('state saved', stored.source === 'de' && stored.target === 'en', JSON.stringify({ s: stored.source, t: stored.target }));
	check('recent recorded', Array.isArray(stored.recent?.source));

	await page.reload({ waitUntil: 'networkidle' });
	check('theme survives reload', (await page.getAttribute('html', 'data-theme')) === 'dark');
	check('languages survive reload', (await page.textContent('#source-tabs .lang-tab.from')) === 'German');
	check('empty text restored', (await page.inputValue('.panel.source textarea')) === '');

	/* Speech: headless Chromium has no voices, so the honest message appears. */
	await page.fill('.panel.source textarea', 'Hi');
	await page.evaluate(() => {
		document.querySelector('.panel.target .translation').textContent = 'Hallo';
		document.querySelector('.panel.source textarea').dispatchEvent(new Event('input'));
	});
	await page.click('#listen-btn');
	check('speech reports clearly', /voice|read text aloud/.test(await page.textContent('#toast')), await page.textContent('#toast'));

	const err = await context.newPage();
	const errErrors = [];
	err.on('pageerror', (e) => errErrors.push(String(e)));
	await err.goto(BASE + '/nope?code=418&url=/old/thing', { waitUntil: 'networkidle' });
	check('error code painted', (await err.textContent('#status-code')) === '418');
	check('error category', (await err.textContent('#status-category')) === 'I’m a Teapot');
	check('error target shown', (await err.textContent('#meta-url')) === '/old/thing');
	check('error title', (await err.title()).startsWith('418 I’m a Teapot'));
	check('error meta time', (await err.textContent('#meta-time')).length > 5);

	await err.goto(BASE + '/nope?code=599', { waitUntil: 'networkidle' });
	check('unknown code falls back', (await err.textContent('#status-category')) === 'Server Error');
	check('unknown code generic copy', (await err.textContent('#status-title')) === 'Something went wrong.');

	await err.goto(BASE + '/no-code-here', { waitUntil: 'networkidle' });
	check('path used as target', (await err.textContent('#meta-url')) === '/no-code-here');
	check('defaults to 404', (await err.textContent('#status-code')) === '404');

	check('no page errors (home)', errors.length === 0, errors.join(' | '));
	check('no page errors (error)', errErrors.length === 0, errErrors.join(' | '));

	await browser.close();
	const failed = results.filter((r) => !r.ok);
	console.log(`\n${results.length - failed.length}/${results.length} passed`);
	process.exit(failed.length ? 1 : 0);
})();
