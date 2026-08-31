/**
 * Verifies dark-mode CSS tokens and that app colors use CSS variables.
 * Run: node scripts/dark-mode-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
const tw = fs.readFileSync(path.join(root, 'tailwind.config.js'), 'utf8');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

check('Dark app bg token', css.includes('--wp-app-bg: #151D2F'));
check('Dark surface token', css.includes('--wp-surface: #1C2639'));
check('Dark header token', css.includes('--wp-header: #111B2E'));
check('Dark inset token', css.includes('--wp-surface-inset: #273349'));
check('Dark sidebar token', css.includes('--wp-sidebar: #1C2943'));
check('Dark border token', css.includes('--wp-border: #34435C'));
check('Light mode app bg preserved', css.includes('--wp-app-bg: #F5F7FC'));
check('Tailwind app.bg uses CSS var', tw.includes("bg: 'var(--wp-app-bg)'"));
check('Tailwind app.surface uses CSS var', tw.includes("surface: 'var(--wp-surface)'"));
check('Tailwind app.header uses CSS var', tw.includes("header: 'var(--wp-header)'"));
check('Logo plate protected in dark', css.includes('.wp-logo-plate'));
check('White remapped in dark', /html\.dark \.bg-white/.test(css));
check('Inputs remapped in dark', /html\.dark input:not/.test(css));
check('Tables remapped in dark', /html\.dark table thead/.test(css));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
