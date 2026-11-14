import type { ReactNode } from 'react';
import AccessDenied from '@/pages/AccessDenied';
import type { Permission } from '@/services/permissions';
import { useCan } from '@/store/session';

/** Route guard. Renders the Access Denied card instead of the page when can() says no. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  return useCan(permission) ? <>{children}</> : <AccessDenied permission={permission} />;
}
