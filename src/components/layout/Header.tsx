import { Menu } from 'lucide-react';
import { useUiStore } from '@/store/ui';
import { CheckedInToggle } from './CheckedInToggle';
import { RoleSwitcher } from './RoleSwitcher';

export function Header() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-500">Yash Earthing Solutions Pvt Ltd</p>
      </div>
      <CheckedInToggle />
      <RoleSwitcher />
    </header>
  );
}
