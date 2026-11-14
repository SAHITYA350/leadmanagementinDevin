import { describe, expect, it } from 'vitest';
import { MODULES, ROLES, type Module, type Role } from '@/db/types';
import { setCheckedIn } from './attendance';
import { exportData, importData, resetData } from './dataTools';
import * as db from './db';
import {
  can,
  canAccessModule,
  ForbiddenError,
  PERMISSIONS,
  scopeLeads,
  type Permission,
} from './permissions';
import { scopedData } from './scope';
import { switchUser } from './session';

const user = (id: string) => db.getUsers().find((u) => u.id === id)!;
const byRole = (role: Role) => db.getUsers().find((u) => u.role === role)!;

// PRD section 4 access matrix.
const EXPECTED: Record<Module, Role[]> = {
  dashboard: ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'BACK_OFFICE'],
  leads: ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  followups: ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  quotations: ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'BACK_OFFICE'],
  orders: ['ADMIN', 'SALES_MANAGER', 'BACK_OFFICE'],
  finance: ['ADMIN', 'SALES_MANAGER', 'BACK_OFFICE'],
  targets: ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  reports: ['ADMIN', 'SALES_MANAGER'],
  team: ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  admin: ['ADMIN'],
  settings: ['ADMIN'],
};

describe('can()', () => {
  it.each(MODULES.flatMap((m) => ROLES.map((r) => [r, m] as const)))('%s -> %s module', (role, module) => {
    expect(canAccessModule(role, module, {})).toBe(EXPECTED[module].includes(role));
  });

  it('answers every role x permission from the matrix', () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      for (const role of ROLES) {
        expect(can(role, permission, {})).toBe((PERMISSIONS[permission] as readonly Role[]).includes(role));
      }
    }
  });

  it('keeps Admin-only actions away from everyone else', () => {
    for (const p of [
      'settings.export',
      'settings.import',
      'settings.reset',
      'admin.audit',
      'leads.delete',
    ] as const) {
      expect(ROLES.filter((r) => can(r, p, {}))).toEqual(['ADMIN']);
    }
    expect(ROLES.filter((r) => can(r, 'team.checkIn', {}))).toEqual(['SALES_EXECUTIVE']);
  });

  it('lets an override remove a whole module, including its actions', () => {
    const overrides = { SALES_MANAGER: { reports: false, leads: false } };
    expect(can('SALES_MANAGER', 'reports.view', overrides)).toBe(false);
    expect(can('SALES_MANAGER', 'leads.assign', overrides)).toBe(false);
    expect(can('SALES_MANAGER', 'targets.view', overrides)).toBe(true);
  });

  it('never lets an override add access or lock Admin out', () => {
    expect(can('BACK_OFFICE', 'admin.view', { BACK_OFFICE: { admin: true } })).toBe(false);
    expect(can('ADMIN', 'admin.view', { ADMIN: { admin: false, settings: false } })).toBe(true);
    expect(can('ADMIN', 'settings.reset', { ADMIN: { settings: false } })).toBe(true);
  });

  it('reads saved overrides by default', () => {
    expect(can('SALES_MANAGER', 'reports.view')).toBe(true);
    db.mutate((d) => void (d.settings.permissions = { SALES_MANAGER: { reports: false } }), {
      label: 'test',
    });
    expect(can('SALES_MANAGER', 'reports.view')).toBe(false);
  });
});

describe('list scope', () => {
  it('Executive sees only own leads', () => {
    const exec = user('USR-003');
    const leads = scopeLeads(exec, db.getLeads(), db.getUsers());
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.every((l) => l.assignedTo === exec.id)).toBe(true);
  });

  it('Manager sees the team plus unassigned, Admin sees all, Back Office sees none', () => {
    const all = db.getLeads();
    const users = db.getUsers();
    const manager = byRole('SALES_MANAGER');
    const team = new Set(
      users.filter((u) => u.managerId === manager.id || u.id === manager.id).map((u) => u.id),
    );
    const managed = scopeLeads(manager, all, users);
    expect(managed.some((l) => l.assignedTo === null)).toBe(true);
    expect(managed.every((l) => l.assignedTo === null || team.has(l.assignedTo))).toBe(true);
    expect(scopeLeads(byRole('ADMIN'), all, users)).toHaveLength(all.length);
    expect(scopeLeads(byRole('BACK_OFFICE'), all, users)).toEqual([]);
  });

  it('scopes follow-ups, quotations, finance and team by role', () => {
    const state = db.getState();
    const exec = scopedData(user('USR-003'), state);
    expect(exec.followups.every((f) => f.assignedTo === 'USR-003')).toBe(true);
    expect(exec.quotes.every((q) => q.requestedBy === 'USR-003')).toBe(true);
    expect(exec.orders).toEqual([]);
    expect(exec.invoices).toEqual([]);
    expect(exec.team.map((u) => u.id)).toEqual(['USR-003']);
    const office = scopedData(byRole('BACK_OFFICE'), state);
    expect(office.leads).toEqual([]);
    expect(office.followups).toEqual([]);
    expect(office.orders.length).toBeGreaterThan(0);
    expect(office.team).toEqual([]);
    expect(scopedData(byRole('ADMIN'), state).team).toHaveLength(6);
  });
});

describe('services check can() again before writing', () => {
  it('blocks data tools for non-admins even when called directly', () => {
    const revision = db.getState().revision;
    for (const role of ['SALES_MANAGER', 'SALES_EXECUTIVE', 'BACK_OFFICE'] as const) {
      const u = byRole(role);
      expect(() => exportData(u)).toThrow(ForbiddenError);
      expect(() => importData(u, db.getState())).toThrow(ForbiddenError);
      expect(() => resetData(u)).toThrow(ForbiddenError);
    }
    expect(db.getState().revision).toBe(revision);
    expect(JSON.parse(exportData(byRole('ADMIN')).json).collections.leads).toHaveLength(60);
  });

  it('only lets an executive check in, and audits it once per action', () => {
    expect(() => setCheckedIn(byRole('SALES_MANAGER'), true)).toThrow('Only Sales Executives');
    const exec = user('USR-003');
    const next = !exec.checkedIn;
    setCheckedIn(exec, next, 'a1');
    setCheckedIn(exec, next, 'a1');
    expect(user('USR-003').checkedIn).toBe(next);
    const entries = db
      .getAudit()
      .filter((a) => a.action === (next ? 'CHECK_IN' : 'CHECK_OUT') && a.actionId === 'a1');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: 'USR-003',
      actorRole: 'SALES_EXECUTIVE',
      before: { checkedIn: !next },
      after: { checkedIn: next },
    });
  });

  it('remembers the demo user across a refresh and audits the switch', () => {
    switchUser('USR-006');
    db.__resetForTests();
    expect(db.getSessionUserId()).toBe('USR-006');
    expect(db.getAudit().at(-1)).toMatchObject({
      action: 'LOGIN',
      actorId: 'USR-006',
      actorRole: 'BACK_OFFICE',
    });
    expect(() => switchUser('USR-999')).toThrow();
  });
});
