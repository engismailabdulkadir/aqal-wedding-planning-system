export function formatWeddingDate(value) {
  if (!value) return 'Not Set Yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set Yet';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

export function getDaysRemainingLabel(value, now = new Date()) {
  if (!value) return '—';
  const weddingDate = new Date(value);
  if (Number.isNaN(weddingDate.getTime())) return '—';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  weddingDate.setHours(0, 0, 0, 0);
  const days = Math.round((weddingDate - today) / 86400000);
  if (days < 0) return 'Wedding date passed';
  if (days === 0) return 'Today';
  return `${days} days`;
}

export function formatBudget(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

/** Currency with cents — use for payments, invoices, and balances. */
export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatSlot(slot) {
  if (!slot) return '—';
  if (slot === 'full_day') return 'Full Day';
  if (slot === 'morning') return 'Morning';
  if (slot === 'evening') return 'Evening';
  return String(slot).replaceAll('_', ' ');
}

