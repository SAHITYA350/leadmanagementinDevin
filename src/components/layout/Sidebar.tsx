import { NavLink } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { can } from '@/services/permissions';
import { useSettings } from '@/store/data';
import { useRole } from '@/store/session';
import { cn } from '@/utils/cn';
import { NAV } from './nav';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const role = useRole();
  const overrides = useSettings().permissions;
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(role, i.permission, overrides)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full w-64 flex-col bg-navy-900 text-slate-300">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Zap className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">Yash Earthing</p>
          <p className="truncate text-xs text-slate-400">Lead Management CRM</p>
        </div>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((group) => (
          <div key={group.title ?? 'home'}>
            {group.title && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-500/15 text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            'size-[18px] shrink-0',
                            isActive ? 'text-brand-500' : 'text-slate-400',
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="shrink-0 border-t border-white/10 px-5 py-3 text-xs text-slate-500">
        Local checking version. Data stays in this browser.
      </p>
    </div>
  );
}
