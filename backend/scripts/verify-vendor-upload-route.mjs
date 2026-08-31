/**
 * Verify vendor listing image upload route is registered.
 * Run: node scripts/verify-vendor-upload-route.mjs
 */
const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';

async function main() {
  const res = await fetch(`${API}/vendor/listings/upload-images`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    console.log('PASS: POST /api/v1/vendor/listings/upload-images exists (401 without token)');
    process.exit(0);
  }
  if (res.status === 404) {
    console.error('FAIL: Route not found. Restart the backend: cd backend && npm run dev');
    console.error(data.message || '');
    process.exit(1);
  }
  console.log(`Unexpected status ${res.status}:`, data);
  process.exit(1);
}

main().catch((err) => {
  console.error('FAIL: Could not reach backend at', API, err.message);
  console.error('Start backend: cd backend && npm run dev');
  process.exit(1);
});
