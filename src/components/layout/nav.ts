import {
  BarChart3,
  Banknote,
  CalendarClock,
  Copy,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  PackageCheck,
  PhoneCall,
  Settings,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/services/permissions';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission: Permission;
  /** Phase in which the screen gets its real content (Architecture section 8). */
  phase: number;
  about: string;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: null,
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
        phase: 1,
        about: 'Your command center.',
      },
    ],
  },
  {
    title: 'Leads',
    items: [
      {
        label: 'Lead Inbox',
        path: '/leads/inbox',
        icon: Inbox,
        permission: 'leads.view',
        phase: 2,
        about: 'New leads arrive here from JustDial, TradeIndia, the website and manual entry.',
      },
      {
        label: 'My Leads',
        path: '/leads/my-leads',
        icon: UserCheck,
        permission: 'leads.view',
        phase: 2,
        about: 'Leads assigned to you, with search and filters.',
      },
      {
        label: 'Pipeline',
        path: '/leads/kanban',
        icon: KanbanSquare,
        permission: 'leads.view',
        phase: 3,
        about: 'Drag leads through New, Contacted, Qualified, Quote Requested, Negotiation and Won.',
      },
      {
        label: 'Follow-ups',
        path: '/leads/followups',
        icon: CalendarClock,
        permission: 'followups.view',
        phase: 3,
        about: 'Today, overdue and upcoming follow-ups as a list or calendar.',
      },
      {
        label: 'Call Logs',
        path: '/leads/calls',
        icon: PhoneCall,
        permission: 'followups.view',
        phase: 3,
        about: 'Every call logged against a lead.',
      },
      {
        label: 'Duplicates',
        path: '/leads/duplicates',
        icon: Copy,
        permission: 'leads.viewTeam',
        phase: 3,
        about: 'Leads created with a phone number that already exists, waiting for review.',
      },
      {
        label: 'Lost Leads',
        path: '/leads/lost',
        icon: XCircle,
        permission: 'leads.view',
        phase: 3,
        about: 'Leads marked Lost, with the reason.',
      },
    ],
  },
  {
    title: 'Sales operations',
    items: [
      {
        label: 'Quotations',
        path: '/quotations',
        icon: FileText,
        permission: 'quotations.view',
        phase: 4,
        about: 'Quote requests, GST quotations, revisions and PDF.',
      },
      {
        label: 'Orders & Inventory',
        path: '/orders',
        icon: PackageCheck,
        permission: 'orders.view',
        phase: 5,
        about: 'Sales orders, stock reservation, dispatch and inventory.',
      },
      {
        label: 'Finance & Recovery',
        path: '/finance',
        icon: Banknote,
        permission: 'finance.view',
        phase: 6,
        about: 'Invoices, payments, ageing and recovery calls.',
      },
    ],
  },
  {
    title: 'Performance',
    items: [
      {
        label: 'Targets',
        path: '/targets',
        icon: Target,
        permission: 'targets.view',
        phase: 7,
        about: 'Monthly and quarterly targets against achieved revenue, calls and conversion.',
      },
      {
        label: 'Reports',
        path: '/reports',
        icon: BarChart3,
        permission: 'reports.view',
        phase: 7,
        about: 'Funnel, source, leaderboard, follow-up compliance, recovery and product revenue.',
      },
      {
        label: 'Team & Attendance',
        path: '/team',
        icon: Users,
        permission: 'team.view',
        phase: 1,
        about: 'Who is checked in today.',
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Admin Control Center',
        path: '/admin',
        icon: ShieldCheck,
        permission: 'admin.view',
        phase: 1,
        about: 'Users, permissions, rules, masters and the audit log.',
      },
      {
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        permission: 'settings.view',
        phase: 1,
        about: 'Export, import and reset the data stored in this browser.',
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
