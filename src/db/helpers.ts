// Pure helpers that work on a draft Database inside db.mutate(). No storage access here.
import type { ActorRole, AuditEntry, Database } from './types';

export const AUDIT_CAP = 5000;
const CODE_RE = /^([A-Z]+(?:-\d{4,6})?)-(\d+)/;

export function nextId(draft: Database, prefix: string, width = 4): string {
  const n = (draft.sequences[prefix] ?? 0) + 1;
  draft.sequences[prefix] = n;
  return `${prefix}-${String(n).padStart(width, '0')}`;
}

/** Rebuilds sequence counters from every id in the database, so new codes never collide with seed codes. */
export function computeSequences(collections: Database['collections']): Record<string, number> {
  const seq: Record<string, number> = {};
  for (const list of Object.values(collections) as { id?: string }[][]) {
    for (const rec of list) {
      const m = rec.id ? CODE_RE.exec(rec.id) : null;
      if (!m) continue;
      const n = Number.parseInt(m[2], 10);
      if (n > (seq[m[1]] ?? 0)) seq[m[1]] = n;
    }
  }
  return seq;
}

export interface AuditInput {
  actorId: string;
  actorRole: ActorRole;
  action: AuditEntry['action'];
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  actionId?: string | null;
  at?: string;
}

export function appendAudit(draft: Database, input: AuditInput): AuditEntry {
  const entry: AuditEntry = {
    id: nextId(draft, 'AU', 5),
    at: input.at ?? new Date().toISOString(),
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
    actionId: input.actionId ?? null,
  };
  draft.collections.audit.push(entry);
  if (draft.collections.audit.length > AUDIT_CAP) {
    draft.collections.audit.splice(0, draft.collections.audit.length - AUDIT_CAP);
  }
  return entry;
}

/** Only the fields that changed, for audit before/after. */
export function diffFields<T extends object>(
  before: T,
  after: T,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key as string] = before[key];
      a[key as string] = after[key];
    }
  }
  return { before: b, after: a };
}
