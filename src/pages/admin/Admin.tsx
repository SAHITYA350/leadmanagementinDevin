import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/utils/cn';
import { AccessMatrix } from './AccessMatrix';
import { AuditLog } from './AuditLog';

const TABS = [
  { id: 'audit', label: 'Audit Log' },
  { id: 'access', label: 'Permissions' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Admin() {
  const [tab, setTab] = useState<TabId>('audit');
  return (
    <>
      <PageHeader
        title="Admin Control Center"
        description="Audit log and the permission matrix are live. Users, assignment rules and masters are added in Phase 7. Export, Import and Reset are under Settings."
      />
      <div
        role="tablist"
        aria-label="Admin sections"
        className="mb-4 inline-flex rounded-xl bg-slate-200/70 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'audit' ? <AuditLog /> : <AccessMatrix />}
    </>
  );
}
