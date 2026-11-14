// Builds the initial database from the bundled src/data/*.json files.
// Seed dates are written around settings.anchorDate; they are shifted so the seed looks "recent" today.
import auditJson from '@/data/audit.json';
import invoicesJson from '@/data/invoices.json';
import leadsJson from '@/data/leads.json';
import ordersJson from '@/data/orders.json';
import paymentsJson from '@/data/payments.json';
import productsJson from '@/data/products.json';
import quotesJson from '@/data/quotes.json';
import recoveryJson from '@/data/recovery.json';
import settingsJson from '@/data/settings.json';
import targetsJson from '@/data/targets.json';
import usersJson from '@/data/users.json';
import { buildDerivedSeed } from '@/data/seed';
import { computeSequences } from './helpers';
import type { Collections, Database, Settings } from './types';
import { SCHEMA_VERSION } from './validate';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const IST_OFFSET_MS = 5.5 * 3_600_000;

function shiftDates<T>(value: T, deltaMs: number): T {
  if (typeof value === 'string') {
    return (ISO_RE.test(value) ? new Date(Date.parse(value) + deltaMs).toISOString() : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, deltaMs)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = shiftDates(v, deltaMs);
    return out as T;
  }
  return value;
}

function istMonthIndex(ms: number): number {
  const d = new Date(ms + IST_OFFSET_MS);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** "2026-11" / "2026-Q4" moved by a number of months. */
export function shiftPeriodKey(key: string, months: number): string {
  const q = /^(\d{4})-Q([1-4])$/.exec(key);
  if (q) {
    const idx = Number(q[1]) * 12 + (Number(q[2]) - 1) * 3 + months;
    return `${Math.floor(idx / 12)}-Q${Math.floor((idx % 12) / 3) + 1}`;
  }
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  const idx = Number(m[1]) * 12 + Number(m[2]) - 1 + months;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

const clone = <T>(v: T): T => structuredClone(v);

export function buildSeedDatabase(nowMs: number = Date.now()): Database {
  const settings = clone(settingsJson) as unknown as Settings;
  const anchor = Date.parse(settings.anchorDate);
  const input = {
    users: clone(usersJson) as unknown as Collections['users'],
    leads: clone(leadsJson) as unknown as Collections['leads'],
    quotes: clone(quotesJson) as unknown as Collections['quotes'],
    orders: clone(ordersJson) as unknown as Collections['orders'],
    invoices: clone(invoicesJson) as unknown as Collections['invoices'],
    recovery: clone(recoveryJson) as unknown as Collections['recovery'],
    products: clone(productsJson) as unknown as Collections['products'],
  };
  const derived = buildDerivedSeed(input, anchor);
  const raw: Collections = {
    ...input,
    ...derived,
    payments: clone(paymentsJson) as unknown as Collections['payments'],
    targets: clone(targetsJson) as unknown as Collections['targets'],
    audit: clone(auditJson) as unknown as Collections['audit'],
    actions: [],
  };
  const collections = shiftDates(raw, nowMs - anchor);
  const monthShift = istMonthIndex(nowMs) - istMonthIndex(anchor);
  for (const t of collections.targets) t.periodKey = shiftPeriodKey(t.periodKey, monthShift);
  const seededAt = new Date(nowMs).toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    seededAt,
    sequences: computeSequences(collections),
    collections,
    settings: { ...settings, seed: { ...settings.seed, seededAt } },
  };
}
