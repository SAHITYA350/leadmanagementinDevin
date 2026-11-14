// Header Checked-In toggle (PRD 6.2): only checked-in executives receive round-robin leads.
import { appendAudit } from '@/db/helpers';
import type { User } from '@/db/types';
import { DbError, mutate } from './db';
import { assertCan } from './permissions';

export function setCheckedIn(actor: User, checkedIn: boolean, actionId?: string): User {
  assertCan(actor.role, 'team.checkIn', 'Only Sales Executives check in and out.');
  return mutate(
    (d) => {
      const user = d.collections.users.find((u) => u.id === actor.id);
      if (!user || !user.active) throw new DbError('GUARD', 'This user is not active.');
      if (user.checkedIn === checkedIn) return user;
      const now = new Date().toISOString();
      const before = { checkedIn: user.checkedIn };
      user.checkedIn = checkedIn;
      if (checkedIn) user.lastCheckInAt = now;
      else user.lastCheckOutAt = now;
      user.updatedAt = now;
      user.updatedBy = actor.id;
      appendAudit(d, {
        actorId: actor.id,
        actorRole: actor.role,
        action: checkedIn ? 'CHECK_IN' : 'CHECK_OUT',
        entityType: 'user',
        entityId: user.id,
        before,
        after: { checkedIn },
        actionId,
        at: now,
      });
      return user;
    },
    { label: 'attendance.set', actionId, actorId: actor.id },
  );
}
