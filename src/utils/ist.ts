// All display and "today" boundaries use Asia/Kolkata (UTC+05:30, no DST).
export const IST_TZ = 'Asia/Kolkata';
export const IST_OFFSET_MS = 5.5 * 3_600_000;

const toMs = (d: string | number | Date) => (typeof d === 'number' ? d : new Date(d).getTime());

export function istDayKey(d: string | number | Date): string {
  return new Date(toMs(d) + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istYYMMDD(d: string | number | Date): string {
  return istDayKey(d).slice(2).replace(/-/g, '');
}

export function isTodayIST(d: string | number | Date, now: number = Date.now()): boolean {
  return istDayKey(d) === istDayKey(now);
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatDate(d: string | number | Date | null | undefined): string {
  return d == null ? '-' : dateFmt.format(new Date(toMs(d)));
}

export function formatTime(d: string | number | Date | null | undefined): string {
  return d == null ? '-' : timeFmt.format(new Date(toMs(d))).toUpperCase();
}

export function formatDateTime(d: string | number | Date | null | undefined): string {
  return d == null ? '-' : `${formatDate(d)}, ${formatTime(d)}`;
}

export function formatRelative(d: string | number | Date, now: number = Date.now()): string {
  const diff = toMs(d) - now;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  const h = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const txt = m < 1 ? 'just now' : m < 60 ? `${m} min` : h < 24 ? `${h} h` : `${days} d`;
  if (txt === 'just now') return txt;
  return diff < 0 ? `${txt} ago` : `in ${txt}`;
}
