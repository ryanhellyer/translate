/**
 * Drives the Analyse and Rewrite modes against stubbed proofreading
 * endpoints, so the UI and the request/response contract can be exercised
 * before the API exists.
 *
 * Run with the site served from public/:
 *   php -S 127.0.0.1:8099 index.php
 *   node .e2e-review.cjs
 */
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8099/';

const TEXT = 'Ich bin nach Berlin gereist letzte Woche. Am Samstag ich bin mit meine Freundin zum Alexanderplatz gegangen, weil ich wollte den Fernsehturm sehen. Wir haben viele Fotos gemacht und das Essen war sehr lecker. Es war eine schöne Erfahrung für mich.';

const CORRECTED = 'Ich bin letzte Woche nach Berlin gereist. Am Samstag bin ich mit meiner Freundin zum Alexanderplatz gegangen, weil ich den Fernsehturm sehen wollte. Wir haben viele Fotos gemacht und das Essen war sehr lecker. Es war eine schöne Erfahrung.';

const REWRITE = 'Ich bin letzte Woche nach Berlin gereist. Am Samstag habe ich mit meiner Freundin den Alexanderplatz besucht, weil ich unbedingt den Fernsehturm sehen wollte. Wir haben viele Fotos gemacht und das Essen war hervorragend. Alles in allem war es eine wunderschöne Reise.';

const results = [];
function check(name, ok, detail = '') {
	results.push({ name, ok });
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

(async () => {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

	const requests = { analyses: [], rewrites: [], translations: [] };
	let failNextAnalysis = false;

	const cors = {
		'access-control-allow-origin': '*',
		'access-control-allow-headers': '*',
		'access-control-allow-methods': 'POST, OPTIONS'
	};

	await page.route('**/v1/translations', async (route) => {
		if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
		const body = route.request().postDataJSON();
		requests.translations.push(body);
		return route.fulfill({
			status: 200,
			headers: { ...cors, 'content-type': 'application/json' },
			body: JSON.stringify({ translation: `[${body.to}] ${body.text}` })
		});
	});

	await page.route('**/v1/analyses', async (route) => {
		if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
		const body = route.request().postDataJSON();
		requests.analyses.push(body);
		if (failNextAnalysis) {
			failNextAnalysis = false;
			return route.fulfill({ status: 503, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
		}

		const text = body.text;
		const issues = [];
		const woche = text.indexOf('letzte Woche');
		issues.push({
			start: woche, end: woche + 'letzte Woche'.length,
			severity: 'correction', category: 'Word order',
			original: 'letzte Woche', replacement: 'letzte Woche',
			sentence: 'Ich bin nach Berlin gereist letzte Woche.',
			corrected: 'Ich bin letzte Woche nach Berlin gereist.',
			explanation: 'English ends a sentence with a time phrase; German moves it before the place.',
			tip: 'Time before place.',
			examples: [{ correct: 'Wir fahren morgen nach Hamburg.', wrong: 'Wir fahren nach Hamburg morgen.' }]
		});
		const samstag = text.indexOf('Am Samstag');
		const verb = text.indexOf('ich bin', samstag);
		issues.push({
			start: verb, end: verb + 'ich bin'.length,
			severity: 'correction', category: 'Verb position',
			original: 'ich bin', replacement: 'bin ich',
			sentence: 'Am Samstag ich bin zum Alexanderplatz gegangen.',
			corrected: 'Am Samstag bin ich zum Alexanderplatz gegangen.',
			explanation: 'The verb must come second in a main clause.',
			tip: 'Position 2 belongs to the verb.',
			examples: [{ correct: 'Heute regnet es.', wrong: 'Heute es regnet.' }]
		});
		const possessiv = text.indexOf('meine Freundin');
		issues.push({
			start: possessiv, end: possessiv + 'meine Freundin'.length,
			severity: 'correction', category: 'Case',
			original: 'meine Freundin', replacement: 'meiner Freundin',
			sentence: 'Ich bin mit meine Freundin zum Alexanderplatz gegangen.',
			corrected: 'Ich bin mit meiner Freundin zum Alexanderplatz gegangen.',
			explanation: '"mit" always takes the dative.',
			tip: 'mit, nach, aus, zu, von, seit, bei.',
			examples: [{ correct: 'Ich fahre mit dem Zug.', wrong: 'Ich fahre mit den Zug.' }]
		});
		const weil = text.indexOf('weil ich wollte den Fernsehturm sehen');
		issues.push({
			start: weil, end: weil + 'weil ich wollte den Fernsehturm sehen'.length,
			severity: 'correction', category: 'Clause order',
			original: 'weil ich wollte den Fernsehturm sehen', replacement: 'weil ich den Fernsehturm sehen wollte',
			sentence: '…, weil ich wollte den Fernsehturm sehen.',
			corrected: '…, weil ich den Fernsehturm sehen wollte.',
			explanation: '"weil" sends the conjugated verb to the end.',
			tip: '"weil" kicks the verb to the end.',
			examples: [{ correct: '…, weil ich Hunger habe.', wrong: '…, weil ich habe Hunger.' }]
		});
		const fuer = text.indexOf('für mich');
		issues.push({
			start: fuer, end: fuer + 'für mich'.length,
			severity: 'suggestion', category: 'Style',
			original: 'für mich', replacement: 'für mich',
			sentence: 'Es war eine schöne Erfahrung für mich.',
			corrected: 'Es war eine schöne Erfahrung.',
			explanation: '"für mich" is copied from English.',
			tip: 'German usually drops it.',
			examples: [{ correct: 'Es war ein schöner Tag.', wrong: 'Es war ein schöner Tag für mich.' }]
		});

		return route.fulfill({
			status: 200,
			headers: { ...cors, 'content-type': 'application/json' },
			body: JSON.stringify({ issues, corrected_text: CORRECTED })
		});
	});

	await page.route('**/v1/rewrites', async (route) => {
		if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
		const body = route.request().postDataJSON();
		requests.rewrites.push(body);

		const changes = [];
		const adoption = REWRITE.indexOf('besucht');
		changes.push({
			start: adoption, end: adoption + 'besucht'.length,
			original: 'gegangen', replacement: 'besucht',
			note: 'A more precise verb.',
		});
		const food = REWRITE.indexOf('hervorragend');
		changes.push({
			start: food, end: food + 'hervorragend'.length,
			original: 'sehr lecker', replacement: 'hervorragend',
			note: 'Stronger wording.',
		});

		return route.fulfill({
			status: 200,
			headers: { ...cors, 'content-type': 'application/json' },
			body: JSON.stringify({ rewrite: REWRITE, changes })
		});
	});

	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	page.on('console', (m) => {
		/* Google Fonts cannot be fetched in the offline sandbox, and the last
		   check deliberately asks the stub for a 503. */
		if (m.type() === 'error'
			&& !/ERR_CERT_AUTHORITY_INVALID/.test(m.text())
			&& !/status of 503/.test(m.text())) {
			errors.push(m.text());
		}
	});

	const settle = () => page.waitForFunction(
		() => !document.querySelector('.translator-card').classList.contains('is-translating'),
		{ timeout: 8000 }
	);

	await page.goto(URL, { waitUntil: 'load' });
	await page.evaluate(() => localStorage.clear());
	await page.reload({ waitUntil: 'load' });
	await settle();

	check('starts in Translate', (await page.getAttribute('.translator-card', 'data-mode')) === 'translate');
	check('review is hidden', !(await page.locator('.review').isVisible()));
	check('translate switch pressed', (await page.getAttribute('.mode-option[data-mode="translate"]', 'aria-pressed')) === 'true');

	/* --- Analyse --- */
	await page.click('.mode-option[data-mode="analyse"]');
	check('switches to Analyse', (await page.getAttribute('.translator-card', 'data-mode')) === 'analyse');
	check('review is visible', await page.locator('.review').isVisible());
	check('translator panels hidden', !(await page.locator('.panels').isVisible()));
	check('analyse view visible', await page.locator('.review-view[data-view="analyse"]').isVisible());
	check('rewrite view hidden', !(await page.locator('.review-view[data-view="rewrite"]').isVisible()));
	check('prompt while empty', (await page.textContent('#insight-stack')).includes('Write something on the left'));
	check('analysis bar visible', await page.locator('.style-bar[data-bar="analyse"]').isVisible());
	check('rewrite bar hidden', !(await page.locator('.style-bar[data-bar="rewrite"]').isVisible()));

	await page.fill('#review-input', TEXT);
	await page.waitForFunction(() => document.querySelectorAll('#analyse-text .review-flag').length === 5, null, { timeout: 8000 });

	const analyseRequest = requests.analyses.at(-1);
	check('analyse sends the text', analyseRequest?.text === TEXT);
	check('analyse sends English language names', analyseRequest?.language === 'German' && analyseRequest?.explanation_language === 'English', JSON.stringify({ l: analyseRequest?.language, e: analyseRequest?.explanation_language }));
	check('analyse sends all checks', JSON.stringify(analyseRequest?.checks) === JSON.stringify(['grammar', 'spelling', 'punctuation', 'style']), JSON.stringify(analyseRequest?.checks));
	check('five highlights drawn', (await page.locator('#analyse-text .review-flag').count()) === 5);
	check('status counts issues', (await page.textContent('#analyse-status')) === '4 corrections · 1 suggestion', await page.textContent('#analyse-status'));
	check('annotated text matches input', (await page.textContent('#analyse-text')) === TEXT);

	const firstInsight = page.locator('#insight-1');
	check('first issue opens automatically', await firstInsight.isVisible());
	check('correction pair shown', (await firstInsight.textContent()).includes('letzte Woche'));
	check('explanation shown', (await firstInsight.textContent()).includes('German moves it before the place'));
	check('tip shown', (await firstInsight.textContent()).includes('Time before place'));
	check('copy enabled', !(await page.locator('#analyse-copy').isDisabled()));

	await page.click('#analyse-text .review-flag[data-issue="3"]');
	check('clicking a highlight selects it', (await page.textContent('#insight-count')) === 'Issue 3 of 5');
	check('its card is the visible one', await page.locator('#insight-3').isVisible());
	check('others hidden', !(await page.locator('#insight-1').isVisible()));
	check('flag marked selected', (await page.getAttribute('#analyse-text .review-flag[data-issue="3"]', 'aria-expanded')) === 'true');

	await page.click('#next-issue');
	check('next moves to issue 4', (await page.textContent('#insight-count')) === 'Issue 4 of 5');
	await page.click('#close-insight');
	check('closing returns to the prompt', (await page.textContent('#insight-stack')).includes('Click a highlight'));

	/* Checks filter */
	await page.click('.style-option[data-check="style"]');
	const filtered = requests.analyses.at(-1);
	check('a check can be turned off', !filtered.checks.includes('style'), JSON.stringify(filtered.checks));
	await page.click('.style-option[data-check="style"]');

	/* --- Rewrite --- */
	await page.click('.mode-option[data-mode="rewrite"]');
	await page.waitForFunction(() => document.querySelector('#rewrite-text mark') !== null, null, { timeout: 8000 });

	const rewriteRequest = requests.rewrites.at(-1);
	check('rewrite sends language and text', rewriteRequest?.language === 'German' && rewriteRequest?.text === TEXT);
	check('natural style omits the style field', rewriteRequest !== undefined && !('style' in rewriteRequest));
	check('rewrite text rendered', (await page.textContent('#rewrite-text')).includes('Alles in allem war es eine wunderschöne Reise'));
	check('rewrite language row reads right', (await page.textContent('#review-explain')) === 'Rewritten in German', await page.textContent('#review-explain'));
	check('changes marked', (await page.locator('#rewrite-text mark').count()) === 2);
	check('change list shown', (await page.locator('#rewrite-change-list li').count()) === 2);
	check('what changed explains phrasing', (await page.textContent('#rewrite-changes')).includes('Stronger wording'));

	check('five rewrite styles', (await page.locator('.style-option[data-rewrite-style]').count()) === 5);
	check('rewrite style names match the translator', JSON.stringify(await page.locator('.style-option[data-rewrite-style]').allTextContents()) === JSON.stringify(['Natural', 'Formal', 'Informal', 'Simple', 'Kitten']));

	await page.click('.style-option[data-rewrite-style="informal"]');
	await page.waitForTimeout(500);
	check('style change re-rewrites', requests.rewrites.at(-1)?.style === 'informal', JSON.stringify(requests.rewrites.at(-1)));

	/* --- The proofreading language picker --- */
	await page.click('#review-select');
	check('language menu opens', await page.locator('#review-menu').isVisible());
	check('every language is offered', (await page.locator('#review-menu .lang-option').count()) > 50);
	await page.fill('#review-search', 'french');
	await page.waitForTimeout(100);
	await page.click('#review-menu .lang-option');
	await page.waitForTimeout(600);
	check('choosing a language re-runs the rewrite', requests.rewrites.at(-1)?.language === 'French', JSON.stringify(requests.rewrites.at(-1)?.language));
	check('language label follows the choice', (await page.textContent('#review-language')) === 'French');
	check('menu closes after choosing', await page.locator('#review-menu').isHidden());

	/* --- Back to Translate, with the new pair --- */
	await page.click('.mode-option[data-mode="translate"]');
	check('translate view returns', await page.locator('.panels').isVisible());
	check('review hides again', !(await page.locator('.review').isVisible()));
	check('translator target follows the proofreading choice', (await page.textContent('#target-tabs .lang-tab.into')) === 'French');
	await page.fill('.panel.source textarea', 'Good morning');
	await page.waitForFunction(() => document.querySelector('.panel.target .translation').value.includes('Good morning'), null, { timeout: 8000 });
	check('translator still works', (await page.inputValue('.panel.target .translation')).includes('[French] Good morning'));

	/* Reset to German from the proofreading picker. */
	await page.click('.mode-option[data-mode="analyse"]');
	await page.waitForTimeout(300);
	await page.click('#review-select');
	await page.fill('#review-search', 'german');
	await page.waitForTimeout(100);
	await page.click('#review-menu .lang-option');
	await page.waitForTimeout(600);
	check('back to German from the picker', (await page.textContent('#review-language')) === 'German');

	/* --- Persistence --- */
	const translationsBeforeReload = requests.translations.length;
	await page.click('.mode-option[data-mode="analyse"]');
	await page.waitForTimeout(300);
	await page.reload({ waitUntil: 'load' });
	await page.waitForFunction(() => document.querySelectorAll('#analyse-text .review-flag').length === 5, null, { timeout: 8000 });
	check('mode survives reload', (await page.getAttribute('.translator-card', 'data-mode')) === 'analyse');
	check('stored mode is pressed after reload', (await page.getAttribute('.mode-option[data-mode="analyse"]', 'aria-pressed')) === 'true');
	check('review text survives reload', (await page.inputValue('#review-input')) === TEXT);
	check('opening in Analyse skips translation', requests.translations.length === translationsBeforeReload, `${requests.translations.length} vs ${translationsBeforeReload}`);

	/* --- Errors --- */
	await page.unroute('**/v1/analyses');
	await page.route('**/v1/analyses', (route) => {
		if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
		return route.fulfill({ status: 503, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
	});
	await page.fill('#review-input', TEXT + ' Noch ein Satz.');
	await page.waitForFunction(() => !document.querySelector('#analyse-error').hidden, null, { timeout: 8000 });
	check('analysis failure explained', (await page.textContent('#analyse-error')).includes('having trouble'));
	check('status says it failed', (await page.textContent('#analyse-status')) === 'Could not check');
	check('copy disabled on failure', await page.locator('#analyse-copy').isDisabled());

	/* --- A clean text and the empty state --- */
	await page.unroute('**/v1/analyses');
	await page.route('**/v1/analyses', (route) => {
		if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
		return route.fulfill({
			status: 200,
			headers: { ...cors, 'content-type': 'application/json' },
			body: JSON.stringify({ issues: [], corrected_text: 'Ein sauberer Satz.' })
		});
	});
	await page.fill('#review-input', 'Ein sauberer Satz.');
	await page.waitForFunction(
		() => document.querySelector('#analyse-status').textContent === 'Looks good',
		null,
		{ timeout: 8000 }
	);
	check('clean text reports looks good', (await page.textContent('#analyse-status')) === 'Looks good');
	check('success prompt shown', (await page.textContent('#insight-stack')).includes('No problems found'));
	check('no highlights for a clean text', (await page.locator('#analyse-text .review-flag').count()) === 0);
	check('copy enabled from corrected text', !(await page.locator('#analyse-copy').isDisabled()));

	await page.fill('#review-input', '');
	await page.waitForTimeout(200);
	check('empty input returns to the prompt', (await page.textContent('#insight-stack')).includes('Write something on the left'));
	check('empty input clears the status', (await page.textContent('#analyse-status')) === '');
	check('clear button hides when empty', await page.locator('#review-clear').isHidden());

	check('no page errors', errors.length === 0, errors.join(' | '));

	await browser.close();
	const failed = results.filter((r) => !r.ok);
	console.log(`\n${results.length - failed.length}/${results.length} passed`);
	process.exit(failed.length ? 1 : 0);
})();
