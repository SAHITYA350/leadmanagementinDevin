// Builds the records that are derived from the seed JSON files: follow-ups, calls, timeline
// and notifications. Runs once on first load / Reset. Deterministic for a given input.
import type {
  AppNotification,
  Call,
  CallOutcome,
  FollowUp,
  Invoice,
  Lead,
  Order,
  Product,
  Quotation,
  RecoveryCase,
  TimelineEntry,
  User,
} from '@/db/types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OPEN = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_REQUESTED', 'NEGOTIATION']);

export interface SeedInput {
  users: User[];
  leads: Lead[];
  quotes: Quotation[];
  orders: Order[];
  invoices: Invoice[];
  recovery: RecoveryCase[];
  products: Product[];
}

export interface DerivedSeed {
  followups: FollowUp[];
  calls: Call[];
  timeline: TimelineEntry[];
  notifications: AppNotification[];
}

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, w = 4) => String(n).padStart(w, '0');
const iso = (ms: number) => new Date(ms).toISOString();

export function buildDerivedSeed(input: SeedInput, nowMs: number): DerivedSeed {
  const rand = prng(7);
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const followups: FollowUp[] = [];
  const calls: Call[] = [];
  const timeline: TimelineEntry[] = [];
  const notifications: AppNotification[] = [];
  const roleOf = (id: string | null) => input.users.find((u) => u.id === id)?.role ?? 'SYSTEM';
  const nameOf = (id: string | null) => input.users.find((u) => u.id === id)?.name ?? 'System';

  const base = (ms: number, by: string) => ({
    createdAt: iso(ms),
    updatedAt: iso(ms),
    createdBy: by,
    updatedBy: by,
    deletedAt: null,
  });
  const tl = (
    leadId: string,
    type: TimelineEntry['type'],
    ms: number,
    actorId: string,
    payload: Record<string, unknown>,
  ) =>
    timeline.push({
      id: `TL-${pad(timeline.length + 1, 5)}`,
      leadId,
      type,
      payload,
      visibility: 'PUBLIC',
      actorId,
      actorRole: actorId === 'SYSTEM' ? 'SYSTEM' : roleOf(actorId),
      at: iso(ms),
    });
  const notify = (
    userId: string,
    type: AppNotification['type'],
    title: string,
    message: string,
    entityType: string,
    entityId: string,
    link: string,
    ms: number,
    read: boolean,
  ) =>
    notifications.push({
      id: `NT-${pad(notifications.length + 1)}`,
      ...base(ms, 'SYSTEM'),
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
      link,
      read,
      readAt: read ? iso(ms + HOUR) : null,
      dedupKey: `${type}:${entityId}:${userId}`,
    });

  const managers = input.users.filter((u) => u.role === 'SALES_MANAGER').map((u) => u.id);
  const backOffice = input.users.filter((u) => u.role === 'BACK_OFFICE').map((u) => u.id);
  const admins = input.users.filter((u) => u.role === 'ADMIN').map((u) => u.id);

  input.leads.forEach((lead, i) => {
    const created = Date.parse(lead.createdAt);
    tl(lead.id, 'CREATED', created, lead.createdBy, { source: lead.source, company: lead.company });
    if (lead.possibleDuplicate && lead.duplicateOfId) {
      tl(lead.id, 'DUPLICATE_FLAGGED', created, lead.createdBy, { duplicateOfId: lead.duplicateOfId });
    }
    if (lead.assignedTo && lead.assignedAt) {
      tl(lead.id, 'ASSIGNED', Date.parse(lead.assignedAt), 'SYSTEM', {
        to: lead.assignedTo,
        toName: nameOf(lead.assignedTo),
        rule: 'Round-robin',
      });
    } else {
      for (const m of managers) {
        notify(
          m,
          'LEAD_UNASSIGNED',
          'Lead waiting for assignment',
          `${lead.company} (${lead.id}) has no executive. No one eligible was checked in.`,
          'lead',
          lead.id,
          `/leads/${lead.id}`,
          created,
          false,
        );
      }
    }
    if (lead.slaBreachedAt) {
      tl(lead.id, 'SLA_BREACHED', Date.parse(lead.slaBreachedAt), 'SYSTEM', { slaDueAt: lead.slaDueAt });
      for (const m of managers) {
        notify(
          m,
          'SLA_BREACH',
          'First-call SLA missed',
          `${lead.company} was not called within 2 hours by ${nameOf(lead.assignedTo)}.`,
          'lead',
          lead.id,
          `/leads/${lead.id}`,
          Date.parse(lead.slaBreachedAt),
          i % 2 === 0,
        );
      }
    }

    // calls: every lead past NEW has at least one call; the first one is the first contact
    if (lead.status !== 'NEW' && lead.firstContactedAt && lead.assignedTo) {
      const n = lead.status === 'CONTACTED' ? int(1, 2) : int(2, 3);
      let t = Date.parse(lead.firstContactedAt);
      for (let k = 0; k < n; k++) {
        const last = k === n - 1;
        const outcome: CallOutcome =
          last || k === 0 ? 'CONNECTED' : (['BUSY', 'CALLBACK_REQUESTED', 'NOT_REACHABLE'] as const)[k % 3];
        const id = `CL-${pad(calls.length + 1)}`;
        calls.push({
          id,
          ...base(t, lead.assignedTo),
          leadId: lead.id,
          userId: lead.assignedTo,
          outcome,
          durationSec: outcome === 'CONNECTED' ? int(60, 420) : 0,
          notes: outcome === 'CONNECTED' ? 'Discussed site requirement and quantity.' : null,
          calledAt: iso(t),
          nextFollowUpId: null,
        });
        tl(lead.id, 'CALL_LOGGED', t, lead.assignedTo, { callId: id, outcome });
        if (k === 0)
          tl(lead.id, 'STATUS_CHANGED', t + 60_000, lead.assignedTo, { from: 'NEW', to: 'CONTACTED' });
        t += int(1, 3) * DAY;
        if (t > nowMs) t = nowMs - int(1, 5) * HOUR;
      }
    }

    // completed follow-ups in the past
    if (lead.assignedTo && lead.status !== 'NEW') {
      const done = lead.status === 'CONTACTED' ? 1 : 2;
      for (let k = 0; k < done; k++) {
        const due = created + (k + 1) * DAY;
        if (due > nowMs) break;
        const id = `FU-${pad(followups.length + 1)}`;
        followups.push({
          id,
          ...base(created, lead.assignedTo),
          leadId: lead.id,
          assignedTo: lead.assignedTo,
          dueAt: iso(due),
          type: k === 0 ? 'CALL' : 'WHATSAPP',
          status: 'DONE',
          note: k === 0 ? 'Call to confirm requirement' : 'Share product catalogue',
          rescheduleCount: 0,
          snoozedUntil: null,
          completedAt: iso(due + HOUR),
          completedBy: lead.assignedTo,
          outcomeNote: 'Done',
          overdueNotifiedAt: null,
        });
        tl(lead.id, 'FOLLOWUP_DONE', due + HOUR, lead.assignedTo, { followUpId: id });
      }
    }

    // every open, assigned lead gets exactly one pending follow-up (north star: no lead without a next action)
    if (OPEN.has(lead.status) && lead.assignedTo) {
      const bucket = i % 20;
      const due =
        bucket < 5
          ? nowMs - int(2, 70) * HOUR
          : bucket < 12
            ? nowMs + int(1, 6) * HOUR
            : nowMs + int(1, 5) * DAY;
      const id = `FU-${pad(followups.length + 1)}`;
      followups.push({
        id,
        ...base(Math.min(nowMs, created + HOUR), lead.assignedTo),
        leadId: lead.id,
        assignedTo: lead.assignedTo,
        dueAt: iso(due),
        type: (['CALL', 'VISIT', 'WHATSAPP', 'EMAIL'] as const)[i % 4],
        status: 'PENDING',
        note:
          lead.status === 'NEW'
            ? 'First call: understand requirement'
            : 'Follow up on requirement and next step',
        rescheduleCount: bucket === 0 ? 2 : 0,
        snoozedUntil: null,
        completedAt: null,
        completedBy: null,
        outcomeNote: null,
        overdueNotifiedAt: due < nowMs ? iso(due + HOUR) : null,
      });
      lead.nextFollowUpAt = iso(due);
      tl(lead.id, 'FOLLOWUP_CREATED', Math.min(nowMs, created + HOUR), lead.assignedTo, {
        followUpId: id,
        dueAt: iso(due),
      });
      if (due < nowMs) {
        notify(
          lead.assignedTo,
          'FOLLOWUP_OVERDUE',
          'Follow-up overdue',
          `Follow-up with ${lead.contactPerson} (${lead.company}) is overdue.`,
          'lead',
          lead.id,
          `/leads/${lead.id}`,
          due + HOUR,
          false,
        );
      }
    }

    if (lead.status === 'LOST' && lead.lostAt) {
      tl(lead.id, 'STATUS_CHANGED', Date.parse(lead.lostAt), lead.assignedTo ?? 'SYSTEM', {
        from: 'CONTACTED',
        to: 'LOST',
        reason: lead.lostReason,
        notes: lead.lostNotes,
      });
    }
  });

  for (const q of input.quotes) {
    tl(q.leadId, 'QUOTE_REQUESTED', Date.parse(q.createdAt), q.requestedBy, {
      quotationId: q.id,
      assignedTo: q.assignedTo,
    });
    if (q.sentAt)
      tl(q.leadId, 'QUOTE_STATUS', Date.parse(q.sentAt), q.assignedTo, { quotationId: q.id, status: 'SENT' });
    if (q.acceptedAt) {
      tl(q.leadId, 'QUOTE_STATUS', Date.parse(q.acceptedAt), q.assignedTo, {
        quotationId: q.id,
        status: 'ACCEPTED',
      });
      tl(q.leadId, 'STATUS_CHANGED', Date.parse(q.acceptedAt), q.assignedTo, {
        from: 'NEGOTIATION',
        to: 'WON',
      });
    }
    if (q.status === 'DRAFT' || q.status === 'UNDER_REVIEW') {
      notify(
        q.assignedTo,
        'QUOTE_REQUESTED',
        'New quotation request',
        `${q.number} requested by ${nameOf(q.requestedBy)}.`,
        'quotation',
        q.id,
        '/quotations',
        Date.parse(q.createdAt),
        q.status === 'UNDER_REVIEW',
      );
    }
  }
  for (const o of input.orders)
    tl(o.leadId, 'ORDER_CREATED', Date.parse(o.createdAt), o.createdBy, { orderId: o.id });
  for (const inv of input.invoices) {
    tl(inv.leadId, 'INVOICE_CREATED', Date.parse(inv.invoiceDate), inv.createdBy, { invoiceId: inv.id });
  }
  for (const rc of input.recovery) {
    if (rc.status === 'OPEN' || rc.status === 'PROMISED' || rc.status === 'DISPUTED') {
      notify(
        rc.assignedTo,
        'PAYMENT_OVERDUE',
        'Payment overdue',
        `Invoice ${rc.invoiceId} is overdue by more than 30 days.`,
        'recovery',
        rc.id,
        '/finance',
        Date.parse(rc.createdAt),
        rc.status !== 'OPEN',
      );
    }
  }
  for (const p of input.products) {
    if (p.onHand - p.reserved <= p.lowStockAt) {
      for (const u of [...backOffice, ...admins]) {
        notify(
          u,
          'LOW_STOCK',
          'Low stock',
          `${p.name}: only ${p.onHand - p.reserved} ${p.unit} available.`,
          'product',
          p.id,
          '/orders',
          nowMs - 2 * HOUR,
          false,
        );
      }
    }
  }

  timeline.sort((a, b) => a.at.localeCompare(b.at));
  return { followups, calls, timeline, notifications };
}
