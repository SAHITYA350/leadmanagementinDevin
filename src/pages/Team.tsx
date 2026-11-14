import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useCan, useScopedData } from '@/store/session';
import { formatDateTime } from '@/utils/ist';
import { ROLE_LABEL } from '@/utils/labels';

export default function Team() {
  const { team } = useScopedData();
  const seesTeam = useCan('team.viewTeam');
  return (
    <>
      <PageHeader
        title="Team & Attendance"
        description={
          seesTeam
            ? 'Who is checked in right now. Only checked-in Sales Executives receive new leads.'
            : 'Your own attendance. Use the Checked in switch in the header to start or stop receiving leads.'
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last check-in</th>
                <th className="px-5 py-3">Last check-out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-5 py-3 text-slate-600">{ROLE_LABEL[u.role]}</td>
                  <td className="px-5 py-3">
                    {!u.active ? (
                      <Badge>Inactive</Badge>
                    ) : u.checkedIn ? (
                      <Badge tone="green">Checked in</Badge>
                    ) : (
                      <Badge tone="amber">Checked out</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{formatDateTime(u.lastCheckInAt)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDateTime(u.lastCheckOutAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
