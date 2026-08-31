/**
 * Smoke checks for global header / account / password wiring.
 * Run: node scripts/header-account-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');

const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function read(rel) {
  return fs.readFileSync(path.join(src, rel), 'utf8');
}

const nav = read('components/navigation/navConfigs.js');
check('No Account in sidebar nav', !/label:\s*'Account'/.test(nav));
check('No Settings in sidebar nav', !/label:\s*'Settings'/.test(nav));

const actions = read('components/layout/GlobalHeaderActions.jsx');
const jsxBlock = actions.slice(actions.indexOf('return ('));
const order = ['FullscreenToggle', 'ThemeSettingsPopover', 'NotificationBell', 'UserProfileMenu'];
const positions = order.map((name) => jsxBlock.indexOf(`<${name}`));
check(
  'Header action order',
  positions.every((p) => p >= 0) && positions.every((p, i) => i === 0 || p > positions[i - 1]),
  order.join(' → '),
);

check('Fullscreen API used', /requestFullscreen/.test(read('components/layout/FullscreenToggle.jsx')));
check('fullscreenchange listener', /fullscreenchange/.test(read('components/layout/FullscreenToggle.jsx')));
check('Profile menu imported in GlobalHeaderActions', /import UserProfileMenu/.test(actions));
check('Role header uses GlobalHeaderActions', /GlobalHeaderActions/.test(read('components/role/RoleLayout.jsx')));
check('Profile menu has My Profile', /My Profile/.test(read('components/account/UserProfileMenu.jsx')));
check('Profile menu has Change Password', /Change Password/.test(read('components/account/UserProfileMenu.jsx')));
check('Profile menu has Logout', /Logout/.test(read('components/account/UserProfileMenu.jsx')));
check('Change password modal exists', /changePassword\(form\)/.test(read('components/account/ChangePasswordModal.jsx')));
check('My Profile page exists', /Back to Dashboard/.test(read('pages/account/MyProfilePage.jsx')));

const routes = read('routes/AppRoutes.jsx');
check('Customer profile route', /path="profile"/.test(routes));
check('Admin profile route', /path="admin\/profile"/.test(routes));
check('Planner profile route', /path="planner\/profile"/.test(routes));
check('Vendor account route', /path="vendor\/account"/.test(routes));

const apiBase = process.env.API_URL || 'http://127.0.0.1:5000/api/v1';
const users = [
  { role: 'admin', username: 'admin', password: 'SeedPass123!' },
  { role: 'customer', username: 'customer.a', password: 'SeedPass123!' },
  { role: 'planner', username: 'planner.seed', password: 'SeedPass123!' },
  { role: 'vendor', username: 'venue.bera', password: 'SeedPass123!' },
];

async function api(pathname, options = {}) {
  const res = await fetch(`${apiBase}${pathname}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function runApiTests() {
  let anyLogin = false;
  for (const account of users) {
    try {
      const login = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: account.username, password: account.password }),
      });
      if (!login.res.ok) {
        check(`${account.role} login`, false, login.data.message || String(login.res.status));
        continue;
      }
      anyLogin = true;
      const token = login.data.token;
      const user = login.data.user;
      check(`${account.role} username dynamic`, Boolean(user?.username), user?.username || '');
      check(`${account.role} role matches`, user?.role === account.role, user?.role || '');

      const wrong = await api('/auth/password', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: 'wrong-password',
          newPassword: 'SeedPass123!',
          confirmPassword: 'SeedPass123!',
        }),
      });
      check(`${account.role} wrong current password rejected`, !wrong.res.ok);

      const short = await api('/auth/password', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: account.password,
          newPassword: '123',
          confirmPassword: '123',
        }),
      });
      check(`${account.role} short password rejected`, !short.res.ok);

      const me = await api('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      check(`${account.role} /auth/me includes createdAt`, Boolean(me.data?.user?.createdAt));
    } catch (error) {
      check(`${account.role} API reachable`, false, error.message);
    }
  }
  if (!anyLogin) {
    check('API smoke skipped notice', true, `Could not login against ${apiBase}; static checks still ran`);
  }
}

await runApiTests();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(failed ? 1 : 0);
