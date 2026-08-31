/**
 * Invitation tests — direct acceptance flow.
 * Run: node scripts/test-invitation-join.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_planning';

const results = [];
function pass(name, detail = '') { results.push({ ok: true, name, detail }); console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`); }
function fail(name, detail = '') { results.push({ ok: false, name, detail }); console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function register(role, suffix) {
  const username = `flow_${suffix}_${Date.now()}`;
  const payload = {
    username,
    email: `${username}@test.local`,
    phone: `+25261${String(Date.now()).slice(-7)}`,
    password: 'TestPass123!',
    firstName: role === 'groom' ? 'Baashi' : 'Muna',
    lastName: 'Test',
    role,
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token, userId: res.data.user._id, email: payload.email };
}

async function createWedding(token, names) {
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  const res = await api('/weddings', {
    method: 'POST',
    token,
    body: {
      partner1Name: names.groom,
      partner2Name: names.bride,
      weddingDate: future.toISOString().slice(0, 10),
      city: 'Mogadishu',
      estimatedBudget: 10000,
      expectedGuests: 100,
    },
  });
  return res.data.wedding;
}

async function main() {
  await mongoose.connect(MONGO);
  const groom = await register('groom', 'baashi');
  const bride = await register('bride', 'muna');
  const wrongGroom = await register('groom', 'wrong');

  const weddingA = await createWedding(groom.token, { groom: 'Baashi', bride: 'Salma' });
  const inviteRes = await api('/wedding-members/invite', {
    method: 'POST',
    token: groom.token,
    body: { weddingId: weddingA._id, partnerEmail: bride.email },
  });
  const codeA = inviteRes.data?.invite?.code;

  // I1
  const weddingB = await createWedding(await register('groom', 'other').then((u) => u.token), { groom: 'Ahmed', bride: 'Fatima' });
  const join = await api('/wedding-members/accept-invitation', {
    method: 'POST',
    token: bride.token,
    body: { invite_code: codeA },
  });
  const Wedding = (await import('../src/models/Wedding.js')).default;
  const refreshed = await Wedding.findById(weddingA._id);
  if (join.status === 200 && String(refreshed.groom) === String(groom.userId) && String(refreshed.bride) === String(bride.userId)) {
    pass('TEST I1', 'Baashi + Muna share Wedding A');
  } else fail('TEST I1', JSON.stringify(join.data));

  // I2 cross wedding
  const inviteB = await api('/wedding-members/invite', {
    method: 'POST',
    token: (await register('groom', 'b2')).token,
    body: { weddingId: weddingB._id, partnerEmail: 'x@test.local' },
  });
  const cross = await api('/wedding-members/accept-invitation', {
    method: 'POST',
    token: bride.token,
    body: { invite_code: codeA, wedding_id: weddingB._id },
  });
  if (cross.status === 400) pass('TEST I2', 'CODE-A cannot join Wedding B');
  else fail('TEST I2', JSON.stringify(cross.data));

  // I3 reuse
  const reuse = await api('/wedding-members/verify', { method: 'POST', token: wrongGroom.token, body: { invite_code: codeA } });
  if (reuse.status === 409) pass('TEST I3', 'Reused code rejected');
  else fail('TEST I3', JSON.stringify(reuse.data));

  // I4 wrong role
  const brideCode = inviteB.data?.invite?.code;
  const roleFail = await api('/wedding-members/verify', { method: 'POST', token: wrongGroom.token, body: { invite_code: brideCode } });
  if (roleFail.status === 403) pass('TEST I4', 'Groom rejected for bride invite');
  else fail('TEST I4', JSON.stringify(roleFail.data));

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nPassed ${passed}/${results.length}`);
  await mongoose.disconnect();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
