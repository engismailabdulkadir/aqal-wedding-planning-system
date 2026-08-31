/**
 * Runtime smoke: login + critical routes, catch ReferenceErrors.
 * Run: node scripts/runtime-route-smoke.mjs
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const NAV_OPTS = { waitUntil: 'domcontentloaded', timeout: 30000 };

const PATHS_AFTER_LOGIN = [
  '/dashboard',
  '/weddings',
  '/weddings/join',
  '/venues',
  '/bookings',
  '/guests',
];

async function registerGroom() {
  const suffix = Date.now();
  const payload = {
    username: `smoke_groom_${suffix}`,
    email: `smoke_groom_${suffix}@test.local`,
    phone: `+25261${String(suffix).slice(-7)}`,
    password: 'TestPass123!',
    firstName: 'Smoke',
    lastName: 'Groom',
    role: 'groom',
  };
  const res = await fetch(`${process.env.API_URL || 'http://127.0.0.1:5000/api/v1'}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Register failed: ${JSON.stringify(data)}`);
  return { username: payload.username, email: payload.email, password: payload.password };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--disable-gpu', '--no-sandbox'],
});

const errors = [];
let failed = false;

function fail(msg) {
  console.log(`FAIL: ${msg}`);
  failed = true;
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

try {
  const creds = await registerGroom();
  const page = await browser.newPage();
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(`${BASE}/login`, { ...NAV_OPTS });
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  await page.click('input[name="username"]');
  await page.type('input[name="username"]', creds.username);
  await page.click('input[name="password"]');
  await page.type('input[name="password"]', creds.password);
  await Promise.all([
    page.waitForNavigation({ ...NAV_OPTS }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);

  if (!page.url().includes('/dashboard')) {
    fail(`Login redirect expected /dashboard, got ${page.url()}`);
  } else {
    pass('Login → /dashboard redirect');
  }

  const dashText = await page.evaluate(() => document.body?.innerText || '');
  const dashHtml = await page.evaluate(() => document.body?.innerHTML || '');
  if (/is not defined|Something went wrong|ErrorBoundary/i.test(dashText)) {
    fail('/dashboard shows error text');
  }
  if (dashHtml.includes('UserProfileMenu is not defined')) fail('UserProfileMenu error on dashboard');
  if (errors.some((e) => /is not defined/i.test(e))) {
    fail(`/dashboard ReferenceError: ${errors.join(' | ')}`);
  } else {
    pass('/dashboard renders without ReferenceError');
  }

  for (const route of PATHS_AFTER_LOGIN) {
    errors.length = 0;
    await page.goto(`${BASE}${route}`, NAV_OPTS);
    const text = await page.evaluate(() => document.body?.innerText || '');
    const html = await page.evaluate(() => document.body?.innerHTML || '');
    if (page.url().includes('/login')) fail(`${route} redirected to login`);
    if (/is not defined/i.test(text) || /is not defined/i.test(html)) fail(`${route} shows undefined component error`);
    const fatal = errors.filter((m) => /is not defined/i.test(m));
    if (fatal.length) fail(`${route} console: ${fatal.join(' | ')}`);
    else pass(`${route} OK`);
  }

  // venues/:id — pick first venue link if present
  await page.goto(`${BASE}/venues`, NAV_OPTS);
  const venueHref = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/venues/"]');
    return a?.getAttribute('href') || null;
  });
  if (venueHref) {
    errors.length = 0;
    await page.goto(`${BASE}${venueHref}`, NAV_OPTS);
    const text = await page.evaluate(() => document.body?.innerText || '');
    if (/is not defined/i.test(text)) fail(`${venueHref} shows undefined error`);
  else pass(`${venueHref} OK`);
  } else {
    pass('/venues/:id skipped (no venue links on page)');
  }
} catch (err) {
  fail(err.message);
} finally {
  await browser.close();
}

if (failed) process.exit(1);
