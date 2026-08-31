import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:5000/api/v1';

async function loginApi() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'customer.a', password: 'SeedPass123!' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'login failed');
  return data;
}

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--window-size=1400,900'],
});
const page = await browser.newPage();
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  const auth = await loginApi();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate((payload) => {
    localStorage.setItem('wedding_token', payload.token);
    localStorage.setItem('wedding_user', JSON.stringify(payload.user));
  }, auth);
  await page.goto(`${BASE}/weddings`, { waitUntil: 'networkidle2' });

  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => /Create New Wedding|Create Your First Wedding|\+ New/i.test(b.textContent)),
    { timeout: 15000 },
  );
  const createBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')]
    .find((b) => /Create New Wedding|Create Your First Wedding|\+ New/i.test(b.textContent)));
  ok('Create Wedding button visible', !!createBtn.asElement());
  await createBtn.asElement().click();

  await page.waitForFunction(() => [...document.querySelectorAll('h2')].some((h) => h.textContent.includes('Create New Wedding')), { timeout: 5000 });
  ok('Create Wedding modal opens', true);

  const weddingDate = '2026-08-31';
  await page.type('input[name="partner1Name"]', 'Muuse');
  await page.type('input[name="partner2Name"]', 'Salma');
  await page.evaluate((value) => {
    const el = document.querySelector('input[name="weddingDate"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, weddingDate);
  await page.type('input[name="city"]', 'Mogadishu');
  await page.type('input[name="expectedGuests"]', '250');
  await page.type('input[name="estimatedBudget"]', '2000');

  const preview = await page.evaluate(() => document.body.innerText.includes('Muuse & Salma Wedding'));
  ok('Auto wedding name preview', preview);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Create Wedding');
    btn?.click();
  });

  await page.waitForFunction(() => document.body.innerText.includes('Wedding Created Successfully'), { timeout: 15000 });
  ok('SweetAlert success shown', true);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Start Booking/i.test(b.textContent));
    btn?.click();
  });

  await page.waitForFunction(() => location.pathname.includes('/bookings'), { timeout: 10000 });
  await page.waitForFunction(() => document.body.innerText.includes('Venue & Hall'), { timeout: 10000 });
  const onCenter = await page.evaluate(() => ({
    path: location.pathname,
    text: document.body.innerText,
  }));
  ok('Booking Center opens', /\/weddings\/.+\/bookings/.test(onCenter.path), onCenter.path);
  ok('Shows Muuse & Salma', onCenter.text.includes('Muuse & Salma'));
  ok('Shows guest count 250', onCenter.text.includes('250'));
  ok('Shows budget', onCenter.text.includes('$2,000') || onCenter.text.includes('2,000'));
  ok('Shows wedding date Aug 2026', /August 31, 2026|Aug 31, 2026/.test(onCenter.text));
  ok('Has Venue & Hall section', onCenter.text.includes('Venue & Hall'));
  ok('Has Bride section', onCenter.text.includes('Wedding Dresses'));
  ok('Has Groom section', onCenter.text.includes('Groom Suits'));
  ok('Has Catering/Photography', onCenter.text.includes('Catering') && onCenter.text.includes('Photography'));

  // Hall date auto from wedding
  await page.goto(`${BASE}/venues`, { waitUntil: 'networkidle2' });
  const venueLink = await page.$('a[href^="/venues/"]');
  if (venueLink) {
    await venueLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await page.waitForSelector('#availability', { timeout: 10000 }).catch(() => null);
    const venueText = await page.evaluate(() => document.body.innerText);
    ok('Venue page uses wedding date copy', /Wedding Date|August 31, 2026|2026/.test(venueText));
    ok('No free date picker when wedding active', !/input type="date"/.test(await page.content()) || venueText.includes('Change Wedding Date'));
  } else {
    ok('Venue browse available', false, 'no venue links');
  }
} catch (error) {
  ok('Unhandled error', false, error.message);
} finally {
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}
