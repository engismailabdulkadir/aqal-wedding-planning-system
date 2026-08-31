/** Money helpers using integer cents to avoid floating-point drift. */

export function toCents(value) {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

export function roundMoney(value) {
  return fromCents(toCents(value));
}

export function addMoney(a, b) {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(total, paid) {
  return fromCents(Math.max(0, toCents(total) - toCents(paid)));
}

export function minMoney(a, b) {
  return fromCents(Math.min(toCents(a), toCents(b)));
}
