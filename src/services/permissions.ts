// Client-side RBAC (demo only). `can(role, permission)` is the single check behind the sidebar,
// routes, buttons, list filtering and every service write.
import type { Lead, Module, PermissionOverrides, Role, User } from '@/db/types';
import { getSettings } from './db';

const ALL: Role[] = ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'BACK_OFFICE'];
const SALES: Role[] = ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'];
const OPS: Role[] = ['ADMIN', 'SALES_MANAGER', 'BACK_OFFICE'];
const MANAGERS: Role[] = ['ADMIN', 'SALES_MANAGER'];
const ADMIN: Role[] = ['ADMIN'];

/** PRD section 4 access matrix. The part before the dot is the module the permission belongs to. */
export const PERMISSIONS = {
  'dashboard.view': ALL,
  'leads.view': SALES,
  'leads.viewTeam': MANAGERS,
  'leads.viewAll': ADMIN,
  'leads.viewUnassigned': MANAGERS,
  'leads.assign': MANAGERS,
  'leads.delete': ADMIN,
  'followups.view': SALES,
  'quotations.view': ALL,
  'quotations.request': SALES,
  'quotations.edit': ['ADMIN', 'BACK_OFFICE'],
  'orders.view': OPS,
  'orders.edit': ['ADMIN', 'BACK_OFFICE'],
  'orders.viewCost': OPS,
  'finance.view': OPS,
  'finance.edit': ['ADMIN', 'BACK_OFFICE'],
  'targets.view': SALES,
  'targets.edit': MANAGERS,
  'reports.view': MANAGERS,
  'team.view': SALES,
  'team.viewTeam': MANAGERS,
  'team.checkIn': ['SALES_EXECUTIVE'],
  'admin.view': ADMIN,
  'admin.users': ADMIN,
  'admin.permissions': ADMIN,
  'admin.audit': ADMIN,
  'settings.view': ADMIN,
  'settings.export': ADMIN,
  'settings.import': ADMIN,
  'settings.reset': ADMIN,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const moduleOf = (permission: Permission) => permission.split('.')[0] as Module;

/** Modules Admin can never lose, so the Permissions Matrix cannot lock everyone out. */
const LOCKED: Partial<Record<Role, Module[]>> = { ADMIN: ['admin', 'settings'] };

export function isModuleLocked(role: Role, module: Module): boolean {
  return LOCKED[role]?.includes(module) ?? false;
}

/** Base matrix before overrides: can this role ever open this module? */
export function baseModuleAccess(role: Role, module: Module): boolean {
  return (PERMISSIONS[`${module}.view` as Permission] as readonly Role[]).includes(role);
}

/**
 * `overrides` comes from Admin -> Permissions Matrix (settings.permissions) and can only remove access.
 * It defaults to the saved settings; tests pass it explicitly.
 */
export function can(
  role: Role,
  permission: Permission,
  overrides: PermissionOverrides = getSettings().permissions,
): boolean {
  if (!(PERMISSIONS[permission] as readonly Role[]).includes(role)) return false;
  const module = moduleOf(permission);
  if (isModuleLocked(role, module)) return true;
  return overrides[role]?.[module] !== false;
}

export function canAccessModule(role: Role, module: Module, overrides?: PermissionOverrides): boolean {
  return can(role, `${module}.view` as Permission, overrides);
}

export class ForbiddenError extends Error {
  code = 'FORBIDDEN' as const;
  constructor(message = 'You do not have access to do this.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Service-layer guard: call before every write so a hidden button cannot be bypassed through the store. */
export function assertCan(role: Role, permission: Permission, message?: string): void {
  if (!can(role, permission)) throw new ForbiddenError(message);
}

/** Ids of the people whose records this user may see: self, plus the team for a manager. `null` = everyone. */
export function visibleUserIds(user: User, users: User[]): Set<string> | null {
  if (can(user.role, 'leads.viewAll')) return null;
  const ids = new Set([user.id]);
  if (can(user.role, 'leads.viewTeam')) {
    for (const u of users) if (u.managerId === user.id) ids.add(u.id);
  }
  return ids;
}

/** Executive = own leads, Manager = team + unassigned, Admin = all, Back Office = none. */
export function scopeLeads(user: User, leads: Lead[], users: User[]): Lead[] {
  if (!can(user.role, 'leads.view')) return [];
  const ids = visibleUserIds(user, users);
  if (ids === null) return leads;
  const unassigned = can(user.role, 'leads.viewUnassigned');
  return leads.filter((l) => (l.assignedTo ? ids.has(l.assignedTo) : unassigned));
}

/** Generic owner filter for follow-ups, calls, targets: anything with a user id on it. */
export function scopeByOwner<T>(
  user: User,
  rows: T[],
  users: User[],
  ownerOf: (row: T) => string | null,
): T[] {
  const ids = visibleUserIds(user, users);
  if (ids === null) return rows;
  return rows.filter((r) => {
    const owner = ownerOf(r);
    return owner != null && ids.has(owner);
  });
}

const ROLE_NAMES: Record<Role, string> = {
  ADMIN: 'Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  BACK_OFFICE: 'Back Office',
};

/** "This section is private for Admin." - names the roles that can open the permission. */
export function privateFor(permission: Permission): string {
  const roles = (PERMISSIONS[permission] as readonly Role[]).map((r) => ROLE_NAMES[r]);
  if (roles.length <= 1) return roles[0] ?? 'Admin';
  return `${roles.slice(0, -1).join(', ')} and ${roles[roles.length - 1]}`;
}
