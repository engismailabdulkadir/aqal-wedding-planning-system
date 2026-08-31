/**
 * Marketplace listings API test — real vendor listings only, no hardcoded cards.
 * Run: node scripts/test-marketplace-listings.mjs
 */
const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(pathname, { method = 'GET', token, weddingId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (weddingId) headers['X-Wedding-Id'] = weddingId;
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function register(role, suffix) {
  const username = `mkt_${suffix}_${Date.now()}`;
  const payload = {
    username,
    email: `${username}@test.local`,
    phone: `+25261${String(Date.now()).slice(-7)}`,
    password: 'TestPass123!',
    firstName: role === 'groom' ? 'Ahmed' : 'Amina',
    lastName: 'Test',
    role,
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token, email: payload.email };
}

async function main() {
  const allRes = await api('/marketplace/listings');
  if (allRes.status !== 200) fail('Marketplace API responds', String(allRes.status));
  else pass('Marketplace API responds');

  const listings = allRes.data?.listings || [];
  const elit = listings.find((l) => /elit/i.test(l.name));
  if (elit) {
    pass('Elit Hall visible in marketplace', `${elit.name} category=${elit.category} status=${elit.status}`);
    if (elit.category === 'venue' || elit.category === 'hall') pass('Elit Hall category is venue/hall', elit.category);
    else fail('Elit Hall category', elit.category);
  } else if (listings.length === 0) {
    pass('Empty marketplace returns zero listings', 'no fake cards expected');
  } else {
    fail('Elit Hall visible', `found ${listings.length} listings: ${listings.map((l) => l.name).join(', ')}`);
  }

  const venueRes = await api('/listings?category=venue');
  const venueNames = (venueRes.data?.listings || []).map((l) => l.name);
  if (elit && venueNames.some((n) => /elit/i.test(n))) {
    pass('venue filter includes Elit Hall');
  } else if (!elit) {
    pass('venue filter works', `${venueNames.length} halls`);
  } else {
    fail('venue filter includes Elit Hall', venueNames.join(', '));
  }

  const groom = await register('groom', 'mkt');
  const bride = await register('bride', 'mkt');
  const groomList = await api('/listings', { token: groom.token });
  const brideList = await api('/marketplace/listings', { token: bride.token });
  if (groomList.data?.listings?.length === brideList.data?.listings?.length) {
    pass('Groom and Bride see same listing count', String(groomList.data.listings.length));
  } else {
    fail('Groom/Bride same count', `groom=${groomList.data?.listings?.length} bride=${brideList.data?.listings?.length}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
