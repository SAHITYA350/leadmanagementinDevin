export function newActionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Highest numeric suffix among codes that start with `prefix-`, e.g. LD-261114-003 -> 3 */
export function maxSequence(codes: string[], prefix: string): number {
  let max = 0;
  for (const code of codes) {
    if (!code.startsWith(`${prefix}-`)) continue;
    const n = Number.parseInt(code.slice(prefix.length + 1).split('-')[0], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}
