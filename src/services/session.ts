// Demo "login": the header Role Switcher picks one of the seeded users. No passwords, no tokens.
import { appendAudit } from '@/db/helpers';
import type { User } from '@/db/types';
import { getSessionUserId, getUsers, mutate, setSessionUserId } from './db';

const DEFAULT_USER_ID = 'USR-001';

export function getActiveUsers(): User[] {
  return getUsers().filter((u) => u.active);
}

/** The user saved in this browser, falling back to Admin if that user no longer exists or is inactive. */
export function resolveCurrentUser(): User {
  const users = getActiveUsers();
  const saved = getSessionUserId();
  return (
    users.find((u) => u.id === saved) ??
    users.find((u) => u.id === DEFAULT_USER_ID) ??
    users.find((u) => u.role === 'ADMIN') ??
    users[0]
  );
}

export function switchUser(userId: string): User {
  const user = getActiveUsers().find((u) => u.id === userId);
  if (!user) throw new Error('That user is not active. Pick another user.');
  const previous = getSessionUserId();
  setSessionUserId(user.id);
  if (previous !== user.id) {
    mutate(
      (d) =>
        appendAudit(d, {
          actorId: user.id,
          actorRole: user.role,
          action: 'LOGIN',
          entityType: 'user',
          entityId: user.id,
          before: previous ? { userId: previous } : null,
          after: { userId: user.id, role: user.role },
          reason: 'Role Switcher (demo login)',
        }),
      { label: 'session.switch', actorId: user.id },
    );
  }
  return user;
}
