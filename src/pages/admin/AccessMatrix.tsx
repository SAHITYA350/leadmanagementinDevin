import { Check, Minus } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { MODULES, ROLES } from '@/db/types';
import { canAccessModule } from '@/services/permissions';
import { useSettings } from '@/store/data';
import { ROLE_LABEL, humanize } from '@/utils/labels';

/** Read-only view of what can() answers today. Editing the toggles arrives with the Admin Control Center (Phase 7). */
export function AccessMatrix() {
  const overrides = useSettings().permissions;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Who can open what"
        description="This table is produced by the same can() check that controls the menu, the pages and the buttons."
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-3">Module</th>
              {ROLES.map((r) => (
                <th key={r} className="px-5 py-3 text-center">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MODULES.map((m) => (
              <tr key={m}>
                <td className="px-5 py-2.5 font-medium text-slate-900">{humanize(m)}</td>
                {ROLES.map((r) => {
                  const allowed = canAccessModule(r, m, overrides);
                  return (
                    <td key={r} className="px-5 py-2.5 text-center">
                      {allowed ? (
                        <Check className="mx-auto size-4 text-brand-600" aria-label="Allowed" />
                      ) : (
                        <Minus className="mx-auto size-4 text-slate-300" aria-label="No access" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
