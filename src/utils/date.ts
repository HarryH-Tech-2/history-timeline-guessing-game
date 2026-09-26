/** Local calendar day as `YYYY-MM-DD` — the key that gates the Daily run. */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** ISO week of the given local day as `YYYY-Www` (weeks run Monday to Sunday). */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // the Thursday decides the ISO year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

/** The ISO week key for a `YYYY-MM-DD` day key. */
export function weekKeyForDay(dayKey: string): string {
  const [y = 1970, m = 1, d = 1] = dayKey.split('-').map(Number);
  return weekKey(new Date(y, m - 1, d));
}
