// Role-scoped views of the data (PRD section 4). Lists must use these, never the raw collections.
import type { Database, User } from '@/db/types';
import { can, scopeByOwner, scopeLeads } from './permissions';

const alive = <T extends { deletedAt?: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);

export interface ScopedData {
  leads: Database['collections']['leads'];
  followups: Database['collections']['followups'];
  quotes: Database['collections']['quotes'];
  orders: Database['collections']['orders'];
  invoices: Database['collections']['invoices'];
  recovery: Database['collections']['recovery'];
  team: User[];
}

export function scopedData(user: User, db: Database): ScopedData {
  const c = db.collections;
  const users = alive(c.users);
  const role = user.role;
  const leads = scopeLeads(user, alive(c.leads), users).filter((l) => !l.mergedIntoId);
  const quotes = alive(c.quotes).filter((q) => q.isLatest);
  return {
    leads,
    followups: can(role, 'followups.view')
      ? scopeByOwner(user, alive(c.followups), users, (f) => f.assignedTo)
      : [],
    quotes: !can(role, 'quotations.view')
      ? []
      : role === 'SALES_EXECUTIVE'
        ? quotes.filter((q) => q.requestedBy === user.id)
        : quotes,
    orders: can(role, 'orders.view') ? alive(c.orders) : [],
    invoices: can(role, 'finance.view') ? alive(c.invoices) : [],
    recovery: can(role, 'finance.view') ? alive(c.recovery) : [],
    team: !can(role, 'team.view')
      ? []
      : can(role, 'leads.viewAll')
        ? users
        : can(role, 'team.viewTeam')
          ? users.filter((u) => u.id === user.id || u.managerId === user.id)
          : users.filter((u) => u.id === user.id),
  };
}
