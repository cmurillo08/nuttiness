export function toFiniteNumber(value, fallback = Number.NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toInteger(value, fallback = 0) {
  return Math.trunc(toFiniteNumber(value, fallback));
}

export function normalizeMoney(value, fallback = 0) {
  const number = toFiniteNumber(value, fallback);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : fallback;
}

export function sumMoney(values = []) {
  return normalizeMoney(values.reduce((total, value) => total + toFiniteNumber(value, 0), 0));
}
