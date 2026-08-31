import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5173';
const EMAIL = 'customer.a@seed.test';
const PASSWORD = 'SeedPass123!';
const ADMIN_EMAIL = 'admin@seed.test';

const CUSTOMER_PATHS = [
  '/dashboard',
  '/weddings',
  '/weddings/new',
  '/venues',
  '/services',
  '/selections',
  '/budget',
  '/guests',
  '/tasks',
  '/timeline',
  '/invitations',
  '/payments',
  '/reports',
  '/messages',
  '/settings',
  '/workspace',
  '/halls',
];

function fail(message, extra = '') {
  console.error(`FAIL: ${message}${extra ? ` — ${extra}` : ''}`);
  process.exitCode = 1;
}

async function pageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--disable-gpu', '--no-sandbox'],
});

try {
  const page = await browser.newPage();
  const errors = await pageErrors(page);

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.type('input[type="email"]', EMAIL);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);

  const afterLogin = page.url();
  if (!afterLogin.endsWith('/dashboard')) fail('Customer login did not land on /dashboard', afterLogin);

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle0', timeout: 30000 });
  const dashText = await page.evaluate(() => document.body?.innerText || '');
  if (!dashText.includes('Customer Dashboard')) fail('/dashboard missing Customer Dashboard heading', dashText.slice(0, 200));
  if (!dashText.includes('Welcome back')) fail('/dashboard missing Welcome back');
  if (dashText.trim().length < 40) fail('/dashboard appears blank');
  console.log('PASS: /dashboard renders Customer Dashboard');

  for (const path of CUSTOMER_PATHS) {
    errors.length = 0;
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0', timeout: 30000 });
    const text = await page.evaluate(() => document.body?.innerText || '');
    const html = await page.evaluate(() => document.body?.innerHTML || '');
    if (page.url().includes('/login')) fail(`${path} redirected to login`);
    if (text.trim().length < 20 || html.trim().length < 50) fail(`${path} appears blank`);
    const fatal = errors.filter((msg) => /is not defined|Cannot read|Minified React/i.test(msg));
    if (fatal.length) fail(`${path} console error`, fatal.join(' | '));
    console.log(`PASS: ${path} rendered (${text.trim().slice(0, 40).replaceAll('\n', ' ')}…)`);
  }

  await page.goto(`${BASE}/not-a-real-customer-page`, { waitUntil: 'networkidle0', timeout: 30000 });
  const notFound = await page.evaluate(() => document.body?.innerText || '');
  if (!/page not found/i.test(notFound)) fail('Customer unknown URL did not show 404', notFound.slice(0, 200));
  console.log('PASS: unknown customer URL shows Page not found');

  const adminContext = await browser.createBrowserContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await adminPage.type('input[type="email"]', ADMIN_EMAIL);
  await adminPage.type('input[type="password"]', PASSWORD);
  await Promise.all([
    adminPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    adminPage.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  if (!adminPage.url().includes('/admin/dashboard')) fail('Admin login did not land on /admin/dashboard', adminPage.url());
  const adminText = await adminPage.evaluate(() => document.body?.innerText || '');
  if (adminText.trim().length < 40) fail('Admin dashboard appears blank');
  console.log('PASS: /admin/dashboard still renders');
} catch (error) {
  fail(error.message);
} finally {
  await browser.close();
}
