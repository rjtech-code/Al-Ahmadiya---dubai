/** Dubai is UTC+4 all year (no daylight saving). Timetables are entered in Dubai local time. */
const OFFSET_MS = 4 * 3600_000;

/** 'YYYY-MM-DD' of the Dubai calendar day containing `d`. */
export const dubaiDate = (d: Date) => new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** ISO weekday (1 = Monday … 7 = Sunday) of a 'YYYY-MM-DD' date. */
export const isoWeekday = (ymd: string) => ((new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

/** UTC instant for a Dubai local date + 'HH:MM'. */
export const dubaiInstant = (ymd: string, hhmm: string) => new Date(new Date(`${ymd}T${hhmm}:00Z`).getTime() - OFFSET_MS);

export const addDays = (ymd: string, n: number) => new Date(new Date(`${ymd}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export const minutesBetween = (a: string, b: string) => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return m(b) - m(a);
};

/** Last `n` calendar months (Dubai), oldest first: { key: 'YYYY-MM', start, end } in UTC. */
export function lastMonths(n: number, now = new Date()) {
  const d = new Date(now.getTime() + 4 * 3600_000);
  const out: { key: string; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const y = d.getUTCFullYear(), m = d.getUTCMonth() - i;
    const start = new Date(Date.UTC(y, m, 1) - 4 * 3600_000), end = new Date(Date.UTC(y, m + 1, 1) - 4 * 3600_000);
    out.push({ key: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7), start, end });
  }
  return out;
}
