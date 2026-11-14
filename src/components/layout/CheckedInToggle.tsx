import { useState } from 'react';
import { setCheckedIn } from '@/services/attendance';
import { useCan, useCurrentUser } from '@/store/session';
import { errorMessage, toast } from '@/store/ui';
import { cn } from '@/utils/cn';
import { newActionId } from '@/utils/ids';

/** Executives only (PRD 6.2). Only checked-in executives receive new leads. */
export function CheckedInToggle() {
  const user = useCurrentUser();
  const allowed = useCan('team.checkIn');
  const [saving, setSaving] = useState(false);
  if (!allowed) return null;

  const toggle = () => {
    setSaving(true);
    try {
      const next = !user.checkedIn;
      setCheckedIn(user, next, newActionId());
      toast.success(
        next
          ? 'You are checked in. New leads can be assigned to you.'
          : 'You are checked out. You will not receive new leads.',
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      role="switch"
      aria-checked={user.checkedIn}
      disabled={saving}
      onClick={toggle}
      title={user.checkedIn ? 'Click to check out' : 'Click to check in and start receiving leads'}
      className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
    >
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          user.checkedIn ? 'bg-brand-500' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
            user.checkedIn && 'translate-x-4',
          )}
        />
      </span>
      <span className="text-sm font-medium text-slate-700">
        {user.checkedIn ? 'Checked in' : 'Checked out'}
      </span>
    </button>
  );
}
