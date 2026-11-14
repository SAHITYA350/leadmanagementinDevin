// Who is "logged in" (demo). Changing the user re-filters every list instantly.
import { useMemo } from 'react';
import { create } from 'zustand';
import type { Role, User } from '@/db/types';
import { can, type Permission } from '@/services/permissions';
import { scopedData, type ScopedData } from '@/services/scope';
import { resolveCurrentUser, switchUser } from '@/services/session';
import { useDataStore } from './data';

interface SessionState {
  userId: string;
  switchUser: (userId: string) => void;
  sync: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: resolveCurrentUser().id,
  switchUser: (userId) => set({ userId: switchUser(userId).id }),
  /** After import/reset the saved user may no longer exist; fall back to a valid one. */
  sync: () => set({ userId: resolveCurrentUser().id }),
}));

export function useCurrentUser(): User {
  const userId = useSessionStore((s) => s.userId);
  const users = useDataStore((s) => s.db.collections.users);
  return users.find((u) => u.id === userId && u.active && !u.deletedAt) ?? resolveCurrentUser();
}

export function useRole(): Role {
  return useCurrentUser().role;
}

/** Re-evaluates when the role or the Admin permission overrides change. */
export function useCan(permission: Permission): boolean {
  const role = useRole();
  const overrides = useDataStore((s) => s.db.settings.permissions);
  return can(role, permission, overrides);
}

/** The current user's slice of the data. Recomputed on every write and on every role switch. */
export function useScopedData(): ScopedData {
  const user = useCurrentUser();
  const db = useDataStore((s) => s.db);
  return useMemo(() => scopedData(user, db), [user, db]);
}
