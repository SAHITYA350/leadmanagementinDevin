// Hand-written runtime validation for data loaded from localStorage or an imported file.
import {
  COLLECTION_NAMES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  ORDER_STATUSES,
  QUOTE_STATUSES,
  ROLES,
  type Database,
} from './types';

export const SCHEMA_VERSION = 1;
const MAX_ERRORS = 25;

export type ValidationResult = { ok: true; db: Database } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function validateDatabase(input: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (msg: string) => {
    if (errors.length < MAX_ERRORS) errors.push(msg);
  };
  if (!isObj(input)) return { ok: false, errors: ['File is not a JSON object.'] };
  if (typeof input.schemaVersion !== 'number') err('schemaVersion is missing.');
  else if (input.schemaVersion > SCHEMA_VERSION)
    err(`schemaVersion ${input.schemaVersion} is newer than this app (${SCHEMA_VERSION}).`);
  if (typeof input.revision !== 'number') err('revision is missing.');
  if (!isObj(input.sequences)) err('sequences is missing.');
  if (!isObj(input.settings)) err('settings is missing.');
  else {
    for (const key of ['company', 'assignment', 'scoring', 'finance', 'permissions', 'masters']) {
      if (!isObj(input.settings[key])) err(`settings.${key} is missing.`);
    }
  }
  if (!isObj(input.collections)) {
    err('collections is missing.');
    return { ok: false, errors };
  }
  const c = input.collections;
  for (const name of COLLECTION_NAMES) {
    const list = c[name];
    if (!Array.isArray(list)) {
      err(`collections.${name} must be a list.`);
      continue;
    }
    const idKey = name === 'actions' ? 'actionId' : 'id';
    const seen = new Set<string>();
    list.forEach((rec, i) => {
      if (!isObj(rec) || typeof rec[idKey] !== 'string') {
        err(`${name}[${i}] has no ${idKey}.`);
        return;
      }
      const id = rec[idKey] as string;
      if (seen.has(id)) err(`${name}: duplicate id ${id}.`);
      seen.add(id);
    });
  }
  if (errors.length) return { ok: false, errors };

  try {
    return validateRecords(input as unknown as Database, errors, err);
  } catch {
    // A record is missing a nested field the checks below read (e.g. an invoice without totals).
    return { ok: false, errors: [...errors, 'Some records are incomplete or have the wrong shape.'] };
  }
}

function validateRecords(db: Database, errors: string[], err: (msg: string) => void): ValidationResult {
  const ids = (name: keyof Database['collections']) =>
    new Set(db.collections[name].map((r) => (r as { id: string }).id));
  const users = ids('users');
  const leads = ids('leads');
  const orders = ids('orders');
  const invoices = ids('invoices');
  const enumCheck = (name: string, id: string, field: string, value: unknown, allowed: readonly string[]) => {
    if (!allowed.includes(value as string)) err(`${name} ${id}: ${field} "${String(value)}" is not valid.`);
  };
  for (const u of db.collections.users) enumCheck('User', u.id, 'role', u.role, ROLES);
  for (const l of db.collections.leads) {
    enumCheck('Lead', l.id, 'status', l.status, LEAD_STATUSES);
    enumCheck('Lead', l.id, 'source', l.source, LEAD_SOURCES);
    if (l.assignedTo && !users.has(l.assignedTo))
      err(`Lead ${l.id}: assigned user ${l.assignedTo} does not exist.`);
  }
  for (const q of db.collections.quotes) {
    enumCheck('Quotation', q.id, 'status', q.status, QUOTE_STATUSES);
    if (!leads.has(q.leadId)) err(`Quotation ${q.id}: lead ${q.leadId} does not exist.`);
  }
  for (const o of db.collections.orders) {
    enumCheck('Order', o.id, 'status', o.status, ORDER_STATUSES);
    if (!leads.has(o.leadId)) err(`Order ${o.id}: lead ${o.leadId} does not exist.`);
  }
  for (const inv of db.collections.invoices) {
    if (!orders.has(inv.orderId)) err(`Invoice ${inv.id}: order ${inv.orderId} does not exist.`);
  }
  for (const p of db.collections.payments) {
    if (!invoices.has(p.invoiceId)) err(`Payment ${p.id}: invoice ${p.invoiceId} does not exist.`);
  }
  for (const r of db.collections.recovery) {
    if (!invoices.has(r.invoiceId)) err(`Recovery ${r.id}: invoice ${r.invoiceId} does not exist.`);
  }
  if (!db.collections.users.some((u) => u.role === 'ADMIN' && u.active))
    err('There must be at least one active Admin user.');
  errors.push(...checkInvariants(db).slice(0, MAX_ERRORS - errors.length));
  return errors.length ? { ok: false, errors } : { ok: true, db };
}

/** Rules that must hold after every write. db.mutate() refuses to save if any fail. */
export function checkInvariants(db: Database): string[] {
  const out: string[] = [];
  for (const p of db.collections.products) {
    if (p.reserved < 0 || p.onHand < 0) out.push(`Product ${p.name}: stock cannot be negative.`);
    if (p.reserved > p.onHand)
      out.push(`Product ${p.name}: reserved (${p.reserved}) is more than on hand (${p.onHand}).`);
  }
  for (const inv of db.collections.invoices) {
    if (inv.receivedPaise > inv.totals.grandTotalPaise)
      out.push(`Invoice ${inv.id}: received is more than the invoice total.`);
    if (inv.receivedPaise + inv.balancePaise !== inv.totals.grandTotalPaise)
      out.push(`Invoice ${inv.id}: received + balance must equal the total.`);
  }
  return out;
}
