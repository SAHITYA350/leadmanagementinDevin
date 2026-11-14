import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import type { AuditAction, AuditEntry } from '@/db/types';
import { useCollection } from '@/store/data';
import { formatDateTime } from '@/utils/ist';
import { ROLE_LABEL, humanize } from '@/utils/labels';

const PAGE = 25;
const TONE: Partial<Record<AuditAction, Tone>> = {
  RESET: 'red',
  DELETE: 'red',
  IMPORT: 'amber',
  EXPORT: 'blue',
  LOGIN: 'violet',
  CHECK_IN: 'green',
  CHECK_OUT: 'amber',
  CREATE: 'green',
};

const show = (v: unknown) => (v == null ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function Change({ entry }: { entry: AuditEntry }) {
  const keys = [...new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])];
  if (!keys.length) return <span className="text-slate-500">{entry.reason ?? '-'}</span>;
  return (
    <div className="space-y-0.5">
      {keys.map((k) => (
        <p key={k} className="text-slate-700">
          <span className="text-slate-500">{k}:</span> {show(entry.before?.[k])}{' '}
          <span className="text-slate-400">to</span> {show(entry.after?.[k])}
        </p>
      ))}
      {entry.reason && <p className="text-xs text-slate-500">{entry.reason}</p>}
    </div>
  );
}

export function AuditLog() {
  const audit = useCollection('audit');
  const users = useCollection('users');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? (id === 'SYSTEM' ? 'System' : id);
    const q = query.trim().toLowerCase();
    return [...audit]
      .reverse()
      .map((e) => ({ entry: e, who: nameOf(e.actorId) }))
      .filter(
        ({ entry: e, who }) =>
          !q ||
          `${who} ${e.action} ${e.entityType} ${e.entityId} ${e.reason ?? ''}`.toLowerCase().includes(q),
      );
  }, [audit, users, query]);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Audit log"
        description="Every change is recorded with who did it, their role, what changed and when. Newest first."
        action={
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Search the audit log</span>
            <Search
              className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search name, action or record"
              className="h-9 w-full rounded-xl border-0 bg-white pr-3 pl-9 text-sm ring-1 ring-slate-300 placeholder:text-slate-400"
            />
          </label>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing matches"
          message="Try a different search word, or clear the search to see every entry."
        />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Who</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Record</th>
                <th className="px-5 py-3">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {rows.slice(0, limit).map(({ entry: e, who }) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDateTime(e.at)}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{who}</p>
                    <p className="text-xs text-slate-500">
                      {e.actorRole === 'SYSTEM' ? 'Automatic' : ROLE_LABEL[e.actorRole]}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={TONE[e.action] ?? 'slate'}>{humanize(e.action)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {humanize(e.entityType)} <span className="text-slate-400">{e.entityId}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Change entry={e} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
        <span>
          Showing {Math.min(limit, rows.length)} of {rows.length}
        </span>
        {rows.length > limit && (
          <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
            Show more
          </Button>
        )}
      </div>
    </Card>
  );
}
