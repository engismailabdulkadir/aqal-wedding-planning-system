import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--window-size=1280,800'],
});

const page = await browser.newPage();
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => localStorage.removeItem('wedding_theme_preference'));
  await page.reload({ waitUntil: 'networkidle2' });

  const gear = await page.waitForSelector('button[aria-label="Settings"]', { timeout: 10000 });
  await gear.click();
  const menuVisible = await page.waitForSelector('[role="menu"]', { timeout: 5000 }).then(() => true).catch(() => false);
  ok('Gear opens settings popup', menuVisible);

  await page.evaluate(() => {
    [...document.querySelectorAll('[role="menuitemradio"]')]
      .find((b) => b.textContent.includes('Dark Mode'))
      ?.click();
  });
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 3000 });
  const darkOn = await page.evaluate(
    () => document.documentElement.classList.contains('dark')
      && localStorage.getItem('wedding_theme_preference') === 'dark',
  );
  ok('Dark Mode applies immediately + localStorage', darkOn);

  await page.reload({ waitUntil: 'networkidle2' });
  const darkPersists = await page.evaluate(
    () => document.documentElement.classList.contains('dark')
      && localStorage.getItem('wedding_theme_preference') === 'dark',
  );
  ok('Dark Mode survives refresh', darkPersists);

  await page.click('button[aria-label="Settings"]');
  await page.waitForSelector('[role="menu"]');
  await page.evaluate(() => {
    [...document.querySelectorAll('[role="menuitemradio"]')]
      .find((b) => b.textContent.includes('Light Mode'))
      ?.click();
  });
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'), { timeout: 3000 });
  const lightOn = await page.evaluate(
    () => !document.documentElement.classList.contains('dark')
      && localStorage.getItem('wedding_theme_preference') === 'light',
  );
  ok('Light Mode applies immediately', lightOn);

  async function openSettingsMenu() {
    const open = await page.$('[role="menu"]');
    if (open) return;
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button[aria-label="Settings"]')];
      const visible = buttons.find((btn) => btn.offsetParent !== null) || buttons[0];
      visible?.click();
    });
    await page.waitForSelector('[role="menu"]', { timeout: 5000 });
  }

  await openSettingsMenu();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.evaluate(() => {
    [...document.querySelectorAll('[role="menuitemradio"]')]
      .find((b) => b.textContent.includes('System Default'))
      ?.click();
  });
  await page.waitForFunction(
    () => document.documentElement.classList.contains('dark')
      && localStorage.getItem('wedding_theme_preference') === 'system',
    { timeout: 3000 },
  );
  ok('System Default follows OS dark', true);

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'), { timeout: 3000 });
  ok('System Default follows OS light change', true);

  await openSettingsMenu();
  await page.evaluate(() => {
    [...document.querySelectorAll('[role="menuitem"]')]
      .find((b) => b.textContent.includes('About Wedding Planner'))
      ?.click();
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll('h2')].some((h) => h.textContent === 'Wedding Planner'),
    { timeout: 3000 },
  );
  ok('About Wedding Planner modal', true);
  await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    dialog?.querySelector('button[aria-label="Close"]')?.click();
  });
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 3000 });

  await openSettingsMenu();
  await page.evaluate(() => {
    [...document.querySelectorAll('[role="menuitem"]')]
      .find((b) => b.textContent.includes('About Team'))
      ?.click();
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll('h2')].some((h) => h.textContent === 'About Team'),
    { timeout: 3000 },
  );
  ok('About Team modal', true);
  await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    dialog?.querySelector('button[aria-label="Close"]')?.click();
  });
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 3000 });

  await openSettingsMenu();
  await page.mouse.click(10, 200);
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'), { timeout: 3000 });
  ok('Click outside closes dropdown', true);

  await openSettingsMenu();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'), { timeout: 3000 });
  ok('Escape closes dropdown', true);

  const bodyText = await page.evaluate(() => document.body.innerText);
  ok(
    'Public UI has no env secret dump',
    !bodyText.includes('PAYMENT_API_KEY') && !bodyText.includes('PAYMENT_PROVIDER'),
  );
} catch (error) {
  ok('Unhandled error', false, error.message);
} finally {
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}
