import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useCollection } from '@/store/data';
import { useCurrentUser, useSessionStore } from '@/store/session';
import { errorMessage, toast } from '@/store/ui';
import { cn } from '@/utils/cn';
import { ROLE_LABEL } from '@/utils/labels';

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Simulated login: pick one of the seeded users. Lists and the sidebar re-filter instantly. */
export function RoleSwitcher() {
  const current = useCurrentUser();
  const users = useCollection('users').filter((u) => u.active && !u.deletedAt);
  const switchUser = useSessionStore((s) => s.switchUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    if (id === current.id) return;
    try {
      switchUser(id);
      const next = users.find((u) => u.id === id);
      if (next) toast.info(`Now viewing as ${next.name} (${ROLE_LABEL[next.role]}).`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch role. Current: ${current.name}, ${ROLE_LABEL[current.role]}`}
        className="flex items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-1.5 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-navy-900 text-xs font-semibold text-white">
          {initials(current.name)}
        </span>
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block truncate text-sm font-medium text-slate-900">{current.name}</span>
          <span className="block truncate text-xs text-slate-500">{ROLE_LABEL[current.role]}</span>
        </span>
        <ChevronDown className="size-4 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Switch role"
          className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200"
        >
          <p className="px-3 pt-2 pb-1.5 text-xs text-slate-500">
            Demo login. Pick a person to see the app as they do.
          </p>
          {users.map((u) => (
            <button
              key={u.id}
              role="menuitemradio"
              aria-checked={u.id === current.id}
              onClick={() => pick(u.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50',
                u.id === current.id && 'bg-brand-50',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                {initials(u.name)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium text-slate-900">{u.name}</span>
                <span className="block truncate text-xs text-slate-500">{ROLE_LABEL[u.role]}</span>
              </span>
              {u.id === current.id && <Check className="size-4 text-brand-600" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
