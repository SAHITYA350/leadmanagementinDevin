// The ONLY module that reads or writes localStorage. Everything else goes through these functions.
import { appendAudit, computeSequences, type AuditInput } from '@/db/helpers';
import { buildSeedDatabase } from '@/db/seedLoader';
import type { ActorRole, Collections, Database } from '@/db/types';
import { checkInvariants, validateDatabase } from '@/db/validate';

export const STORAGE_KEY = 'yash_erp_local_v1';
export const BACKUP_KEY = 'yash_erp_local_v1_backup';
export const SESSION_KEY = 'yash_erp_session';
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;
const ACTION_TTL_MS = 24 * 3_600_000;

export type DbErrorCode = 'GUARD' | 'FORBIDDEN' | 'VALIDATION' | 'INVARIANT' | 'QUOTA';
export class DbError extends Error {
  constructor(
    public code: DbErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DbError';
  }
}

export type LoadOutcome = 'loaded' | 'seeded' | 'restored-backup' | 'reseeded-corrupt';
export interface LoadNotice {
  outcome: LoadOutcome;
  message: string | null;
}

type Listener = (db: Database) => void;
let state: Database | null = null;
let lastNotice: LoadNotice | null = null;
const listeners = new Set<Listener>();
let storageListenerAttached = false;

function read(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, db: Database) {
  try {
    localStorage.setItem(key, JSON.stringify(db));
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    throw new DbError(
      quota ? 'QUOTA' : 'VALIDATION',
      quota
        ? 'Browser storage is full. Export your data from Settings, then clear old audit entries.'
        : 'Could not save data to browser storage.',
    );
  }
}

function emit() {
  if (!state) return;
  for (const fn of listeners) fn(state);
}

function systemAudit(db: Database, input: Omit<AuditInput, 'actorId' | 'actorRole'>) {
  appendAudit(db, { actorId: 'SYSTEM', actorRole: 'SYSTEM', ...input });
}

function attachStorageListener() {
  if (storageListenerAttached || typeof window === 'undefined') return;
  storageListenerAttached = true;
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || e.newValue == null) return;
    try {
      const result = validateDatabase(JSON.parse(e.newValue));
      if (result.ok && (!state || result.db.revision > state.revision)) {
        state = result.db;
        emit();
      }
    } catch {
      /* another tab wrote something unreadable; keep our copy */
    }
  });
}

/** Loads the database from localStorage, seeding or recovering if needed. Safe to call more than once. */
export function init(nowMs: number = Date.now()): LoadNotice {
  if (state && lastNotice) return lastNotice;
  attachStorageListener();
  const stored = read(STORAGE_KEY);
  if (stored === undefined) {
    state = buildSeedDatabase(nowMs);
    write(STORAGE_KEY, state);
    lastNotice = { outcome: 'seeded', message: null };
    return lastNotice;
  }
  const result = validateDatabase(stored);
  if (result.ok) {
    state = result.db;
    lastNotice = { outcome: 'loaded', message: null };
    return lastNotice;
  }
  const backup = validateDatabase(read(BACKUP_KEY));
  if (backup.ok) {
    state = backup.db;
    systemAudit(state, {
      action: 'RESTORE',
      entityType: 'database',
      entityId: STORAGE_KEY,
      reason: 'Saved data was damaged; restored the last backup.',
    });
    lastNotice = {
      outcome: 'restored-backup',
      message: 'Saved data was damaged, so the last backup was restored.',
    };
  } else {
    state = buildSeedDatabase(nowMs);
    systemAudit(state, {
      action: 'RESET',
      entityType: 'database',
      entityId: STORAGE_KEY,
      reason: 'Saved data was damaged and no valid backup existed; demo data reloaded.',
    });
    lastNotice = {
      outcome: 'reseeded-corrupt',
      message: 'Saved data was damaged and no backup was usable, so demo data was reloaded.',
    };
  }
  write(STORAGE_KEY, state);
  return lastNotice;
}

export function getState(): Database {
  if (!state) init();
  return state as Database;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface MutateOptions {
  label: string;
  actionId?: string;
  actorId?: string;
}

/**
 * The only write path. Runs `fn` on a copy; if it throws or breaks an invariant nothing is saved.
 * A repeated `actionId` returns the first result without running the change again.
 */
export function mutate<T>(fn: (draft: Database) => T, opts: MutateOptions): T {
  const current = getState();
  if (opts.actionId) {
    const done = current.collections.actions.find((a) => a.actionId === opts.actionId);
    if (done) return done.result as T;
  }
  const draft = structuredClone(current);
  const result = fn(draft);
  const problems = checkInvariants(draft);
  if (problems.length) throw new DbError('INVARIANT', problems[0]);
  const now = Date.now();
  draft.collections.actions = draft.collections.actions.filter(
    (a) => now - Date.parse(a.createdAt) < ACTION_TTL_MS,
  );
  if (opts.actionId) {
    draft.collections.actions.push({
      actionId: opts.actionId,
      label: opts.label,
      actorId: opts.actorId ?? 'SYSTEM',
      result: result === undefined ? null : structuredClone(result),
      createdAt: new Date(now).toISOString(),
    });
  }
  draft.revision = current.revision + 1;
  write(STORAGE_KEY, draft);
  state = draft;
  emit();
  return result;
}

// ---------- read helpers (PRD: getLeads(), etc.) ----------
const live = <K extends keyof Collections>(name: K) =>
  (getState().collections[name] as { deletedAt?: string | null }[]).filter(
    (r) => !r.deletedAt,
  ) as Collections[K];
export const getUsers = () => live('users');
export const getLeads = () => live('leads');
export const getProducts = () => live('products');
export const getQuotes = () => live('quotes');
export const getOrders = () => live('orders');
export const getInvoices = () => live('invoices');
export const getAudit = () => getState().collections.audit;
export const getSettings = () => getState().settings;

// ---------- data tools ----------
interface Actor {
  id: string;
  role: ActorRole;
}

function saveBackup() {
  if (state) write(BACKUP_KEY, state);
}

export function exportJson(actor?: Actor): string {
  const db = getState();
  if (actor) {
    mutate(
      (d) =>
        appendAudit(d, {
          actorId: actor.id,
          actorRole: actor.role,
          action: 'EXPORT',
          entityType: 'database',
          entityId: STORAGE_KEY,
        }),
      { label: 'export' },
    );
  }
  return JSON.stringify(actor ? getState() : db, null, 2);
}

export interface ImportPreview {
  ok: boolean;
  errors: string[];
  counts: Partial<Record<keyof Collections, number>>;
  db?: Database;
}

export function previewImport(text: string): ImportPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This file is not valid JSON.'], counts: {} };
  }
  const result = validateDatabase(parsed);
  if (!result.ok) return { ok: false, errors: result.errors, counts: {} };
  const counts = Object.fromEntries(Object.entries(result.db.collections).map(([k, v]) => [k, v.length]));
  return { ok: true, errors: [], counts, db: result.db };
}

export function importDatabase(db: Database, actor: Actor): void {
  const checked = validateDatabase(structuredClone(db));
  if (!checked.ok) throw new DbError('VALIDATION', checked.errors[0]);
  saveBackup();
  const next = checked.db;
  const fromIds = computeSequences(next.collections);
  for (const [prefix, n] of Object.entries(fromIds)) {
    const given = next.sequences[prefix];
    next.sequences[prefix] = typeof given === 'number' && given > n ? given : n;
  }
  next.revision = (state?.revision ?? 0) + 1;
  appendAudit(next, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'IMPORT',
    entityType: 'database',
    entityId: STORAGE_KEY,
    reason: 'Imported from JSON file',
  });
  write(STORAGE_KEY, next);
  state = next;
  emit();
}

export function resetDemoData(actor: Actor, nowMs: number = Date.now()): void {
  saveBackup();
  const next = buildSeedDatabase(nowMs);
  next.revision = (state?.revision ?? 0) + 1;
  appendAudit(next, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'RESET',
    entityType: 'database',
    entityId: STORAGE_KEY,
    reason: 'Reset demo data from src/data JSON files',
  });
  write(STORAGE_KEY, next);
  state = next;
  emit();
}

export function hasBackup(): boolean {
  return localStorage.getItem(BACKUP_KEY) != null;
}

export function storageUsage(): { bytes: number; limit: number } {
  let bytes = 0;
  for (const key of [STORAGE_KEY, BACKUP_KEY, SESSION_KEY])
    bytes += (localStorage.getItem(key)?.length ?? 0) * 2;
  return { bytes, limit: STORAGE_LIMIT_BYTES };
}

// ---------- demo session (which seeded user is "logged in") ----------
export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(id: string): void {
  localStorage.setItem(SESSION_KEY, id);
}

/** Test helper: forget the in-memory copy so the next call re-reads localStorage (like a page refresh). */
export function __resetForTests(): void {
  state = null;
  lastNotice = null;
}
