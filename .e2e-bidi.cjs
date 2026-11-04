const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8099/';

function assert(cond, message) {
  if (!cond) throw new Error('FAIL: ' + message);
  console.log('ok  ' + message);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const requests = [];
  let failNext = false;
  await page.route('**/v1/translations', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    requests.push(body);
    if (failNext) {
      failNext = false;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      return;
    }
    const reply = body.from === 'English' ? `DE(${body.text})` : `EN(${body.text})`;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ translation: reply }) });
  });

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.translator-card');
  await page.waitForTimeout(900);

  const left = page.locator('.panel.source textarea');
  const right = page.locator('.panel.target .translation');
  const error = page.locator('.panel.target .translation-error');

  assert(await page.locator('.panels textarea').count() === 2, 'both panels are textareas');

  const metrics = await page.evaluate(() => {
    const grab = (el) => {
      const s = getComputedStyle(el);
      return [s.fontFamily, s.fontSize, s.lineHeight, s.paddingTop, s.paddingLeft, s.paddingRight, s.whiteSpace, s.overflowWrap].join('|');
    };
    return [
      grab(document.querySelector('.panel.source textarea')),
      grab(document.querySelector('.panel.target .translation')),
    ];
  });
  assert(metrics[0] === metrics[1], 'both boxes share identical text metrics');

  await left.fill('Hello world');
  await page.waitForFunction(() => document.querySelector('.panel.target .translation').value === 'DE(Hello world)');
  assert(true, 'typing on the left fills the right');
  let last = requests[requests.length - 1];
  assert(last.from === 'English' && last.to === 'German', 'forward request is English>German');

  const before = requests.length;
  await right.click();
  await right.fill('Guten Tag');
  await page.waitForFunction(() => document.querySelector('.panel.source textarea').value === 'EN(Guten Tag)');
  assert(true, 'typing on the right fills the left');
  last = requests[requests.length - 1];
  assert(last.from === 'German' && last.to === 'English', 'reverse request is German>English');
  await page.waitForTimeout(1200);
  assert(requests.length === before + 1, 'programmatic write triggered no extra request');
  assert(await page.textContent('.panel.source .char-count') === '13 / 20,000', 'counter follows the derived text');

  const before2 = requests.length;
  await left.click();
  await left.fill('Hello again');
  await page.waitForFunction(() => document.querySelector('.panel.target .translation').value === 'DE(Hello again)');
  last = requests[requests.length - 1];
  assert(last.from === 'English' && last.to === 'German', 'editing the left switches direction back');
  assert(requests.length === before2 + 1, 'exactly one request for that edit');

  /* --- an error in the forward direction stands in for the result --- */
  failNext = true;
  await left.fill('Boom');
  await page.waitForSelector('.panel.target.is-error');
  assert(await error.isVisible(), 'error message is shown');
  assert(await right.evaluate((el) => getComputedStyle(el).display) === 'none', 'result box is replaced by the error');
  assert(await page.locator('#copy-btn').isDisabled(), 'copy is disabled on an error');

  await left.fill('Recovered');
  await page.waitForFunction(() => document.querySelector('.panel.target .translation').value === 'DE(Recovered)');
  assert(!(await page.locator('.panel.target').evaluate((el) => el.classList.contains('is-error'))), 'the error clears on the next result');

  /* --- an error while typing in the result box must not hide it --- */
  await right.click();
  failNext = true;
  await right.fill('Zwei');
  await page.waitForSelector('.panel.target.is-error');
  assert(await right.isVisible(), 'the box being typed in stays visible through an error');
  assert(await right.inputValue() === 'Zwei', 'the typed text is kept');

  /* --- auto mode --- */
  await page.evaluate(() => {
    localStorage.setItem('translate-state', JSON.stringify({ source: 'auto', target: 'de', style: null, recent: {}, input: 'Hallo', output: '' }));
  });
  await page.reload();
  await page.waitForSelector('.translator-card');
  await page.waitForTimeout(900);

  const readOnly = await right.evaluate((el) => el.readOnly);
  assert(readOnly === true, 'result box is locked while the source is "Detect language"');

  const before3 = requests.length;
  await right.evaluate((el) => {
    el.value = 'sneaky edit';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  assert(await left.inputValue() !== 'sneaky edit', 'a locked box cannot drive the direction');
  assert(requests.length === before3, 'no reverse request was made in auto mode');

  /* --- mobile layout --- */
  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await phone.route('**/v1/translations', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ translation: 'DE(mobile)' })
  }));
  await phone.goto(URL);
  await phone.evaluate(() => localStorage.clear());
  await phone.reload();
  await phone.waitForSelector('.translator-card');
  await phone.waitForTimeout(900);

  const phonePads = await phone.evaluate(() => {
    const p = (sel) => getComputedStyle(document.querySelector(sel)).paddingRight;
    return [p('.panel.source textarea'), p('.panel.target .translation')];
  });
  assert(phonePads[0] === phonePads[1], 'mobile boxes share the same text width');

  await phone.locator('#clear-btn').click();
  assert(!(await phone.locator('.panel.target').isVisible()), 'empty result panel is hidden on mobile');

  await phone.locator('.panel.source textarea').fill('Hallo');
  await phone.waitForFunction(() => document.querySelector('.panel.target .translation').value === 'DE(mobile)');
  assert(await phone.locator('.panel.target').isVisible(), 'result panel appears once there is one');

  await browser.close();
  console.log('\nall checks passed');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
