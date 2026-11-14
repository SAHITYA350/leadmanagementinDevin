import type { LeadStatus, Role } from '@/db/types';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  BACK_OFFICE: 'Back Office',
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  QUOTE_REQUESTED: 'Quote Requested',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function scoreBand(score: number): 'Hot' | 'Warm' | 'Cold' {
  return score >= 80 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';
}
