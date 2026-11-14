import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Banknote,
  CalendarClock,
  FileText,
  PackageCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { LEAD_STATUSES } from '@/db/types';
import { useCan, useCurrentUser, useScopedData } from '@/store/session';
import { ROLE_LABEL, STATUS_LABEL } from '@/utils/labels';
import { formatINRShort } from '@/utils/money';

const SCOPE_TEXT = {
  ADMIN: 'You see everything across the company.',
  SALES_MANAGER: 'You see your team and the unassigned queue.',
  SALES_EXECUTIVE: 'You see only the leads assigned to you.',
  BACK_OFFICE: 'You see quotations, orders, payments and recovery. Lead lists are private to Sales.',
} as const;

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="size-5" aria-hidden />
        </div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

export default function Dashboard() {
  const user = useCurrentUser();
  const data = useScopedData();
  const showLeads = useCan('leads.view');
  const showFollowups = useCan('followups.view');
  const showOrders = useCan('orders.view');
  const showFinance = useCan('finance.view');
  const showTeam = useCan('team.viewTeam');

  const now = Date.now();
  const openLeads = data.leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST');
  const unassigned = openLeads.filter((l) => !l.assignedTo).length;
  const overdue = data.followups.filter((f) => f.status === 'PENDING' && Date.parse(f.dueAt) < now).length;
  const outstanding = data.invoices.reduce((sum, i) => sum + i.balancePaise, 0);
  const openOrders = data.orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
  const byStatus = LEAD_STATUSES.map((s) => ({
    status: STATUS_LABEL[s],
    leads: data.leads.filter((l) => l.status === s).length,
  }));

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        description={`${ROLE_LABEL[user.role]} view. ${SCOPE_TEXT[user.role]}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {showLeads && (
          <Stat
            icon={UserCheck}
            label="Open leads"
            value={openLeads.length}
            hint={`${data.leads.length} in total${showTeam ? `, ${unassigned} unassigned` : ''}`}
          />
        )}
        {showFollowups && (
          <Stat
            icon={CalendarClock}
            label="Overdue follow-ups"
            value={overdue}
            hint="Pending follow-ups past their due time"
          />
        )}
        <Stat
          icon={FileText}
          label="Quotations"
          value={data.quotes.length}
          hint={user.role === 'SALES_EXECUTIVE' ? 'Requested by you' : 'Latest revision of each quotation'}
        />
        {showOrders && (
          <Stat
            icon={PackageCheck}
            label="Open orders"
            value={openOrders}
            hint={`${data.orders.length} orders in total`}
          />
        )}
        {showFinance && (
          <Stat
            icon={Banknote}
            label="Outstanding"
            value={formatINRShort(outstanding)}
            hint={`${data.recovery.length} recovery cases`}
          />
        )}
        {showTeam && (
          <Stat
            icon={Users}
            label="Team checked in"
            value={`${data.team.filter((u) => u.checkedIn).length} / ${data.team.length}`}
            hint="Only checked-in executives receive leads"
          />
        )}
      </div>

      {showLeads && (
        <Card className="mt-6">
          <CardHeader
            title="Leads by stage"
            description="Counts for the leads you are allowed to see. Switch role in the header to see this change."
          />
          <div className="h-72 px-2 pt-4 pb-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 256 }}>
              <BarChart data={byStatus} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 13 }}
                />
                <Bar
                  dataKey="leads"
                  name="Leads"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  );
}
