import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/nav';
import type { Role } from '@/db/types';
import * as db from '@/services/db';
import { can } from '@/services/permissions';
import { reloadDataStore } from '@/store/data';
import { useSessionStore } from '@/store/session';
import { AppRoutes } from './router';

const USER_BY_ROLE: Record<Role, { id: string; name: string }> = {
  ADMIN: { id: 'USR-001', name: 'Yash Admin' },
  SALES_MANAGER: { id: 'USR-002', name: 'Rajesh Patil' },
  SALES_EXECUTIVE: { id: 'USR-003', name: 'Rahul More' },
  BACK_OFFICE: { id: 'USR-006', name: 'Sneha Deshmukh' },
};

function renderApp(path = '/dashboard', role: Role = 'ADMIN') {
  useSessionStore.getState().switchUser(USER_BY_ROLE[role].id);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

const navLabels = () =>
  within(screen.getAllByRole('navigation', { name: 'Main' })[0])
    .getAllByRole('link')
    .map((a) => a.textContent);
const switchTo = async (name: string) => {
  await userEvent.click(screen.getByRole('button', { name: /Switch role/ }));
  await userEvent.click(within(screen.getByRole('menu')).getByText(name));
};

beforeEach(() => {
  reloadDataStore();
  useSessionStore.getState().sync();
});

describe('sidebar', () => {
  it.each(Object.keys(USER_BY_ROLE) as Role[])('%s sees only the screens can() allows', (role) => {
    renderApp('/dashboard', role);
    expect(navLabels()).toEqual(NAV_ITEMS.filter((i) => can(role, i.permission)).map((i) => i.label));
  });

  it('hides Admin and Settings from everyone except Admin', () => {
    renderApp('/dashboard', 'SALES_MANAGER');
    expect(navLabels()).not.toContain('Admin Control Center');
    expect(navLabels()).not.toContain('Settings');
    expect(navLabels()).toContain('Reports');
  });

  it('gives Back Office no lead screens', () => {
    renderApp('/dashboard', 'BACK_OFFICE');
    expect(navLabels()).toEqual(['Dashboard', 'Quotations', 'Orders & Inventory', 'Finance & Recovery']);
  });
});

describe('route guard', () => {
  it('shows Access Denied with Go Back when the address is typed directly', () => {
    renderApp('/admin', 'SALES_EXECUTIVE');
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(
      screen.getByText('This section is private for Admin. Contact Admin if you need access.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeEnabled();
    expect(screen.queryByText('Audit log')).not.toBeInTheDocument();
  });

  it.each([
    ['/settings', 'SALES_MANAGER'],
    ['/reports', 'SALES_EXECUTIVE'],
    ['/leads/my-leads', 'BACK_OFFICE'],
    ['/orders', 'SALES_EXECUTIVE'],
  ] as const)('%s is blocked for %s', (path, role) => {
    renderApp(path, role);
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });

  it('opens the page for an allowed role and a friendly page for an unknown address', () => {
    renderApp('/admin', 'ADMIN');
    expect(screen.getByRole('heading', { name: 'Admin Control Center' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('shows Page not found for an unknown address', () => {
    renderApp('/nope');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});

describe('role switcher', () => {
  it('re-filters the menu and the data instantly, and survives a refresh', async () => {
    renderApp('/dashboard', 'ADMIN');
    expect(screen.getByRole('heading', { name: 'Welcome, Yash' })).toBeInTheDocument();
    expect(screen.getByText(/60 in total/)).toBeInTheDocument();

    await switchTo('Rahul More');
    expect(screen.getByRole('heading', { name: 'Welcome, Rahul' })).toBeInTheDocument();
    const own = db.getLeads().filter((l) => l.assignedTo === 'USR-003').length;
    expect(screen.getByText(`${own} in total`)).toBeInTheDocument();
    expect(navLabels()).not.toContain('Reports');
    expect(db.getSessionUserId()).toBe('USR-003');

    await switchTo('Sneha Deshmukh');
    expect(screen.queryByText('Open leads')).not.toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
  });

  it('moves to Access Denied when the new role may not see the current page', async () => {
    renderApp('/settings', 'ADMIN');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    await switchTo('Priya Sharma');
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });
});

describe('checked-in toggle', () => {
  it('is shown only to executives and saves the change', async () => {
    renderApp('/dashboard', 'ADMIN');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    await switchTo('Rahul More');
    const toggle = screen.getByRole('switch');
    const before = toggle.getAttribute('aria-checked') === 'true';
    await userEvent.click(toggle);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', String(!before));
    expect(db.getUsers().find((u) => u.id === 'USR-003')?.checkedIn).toBe(!before);
  });
});

describe('settings data tools', () => {
  it('resets after confirmation and records it in the audit log', async () => {
    db.mutate((d) => void (d.collections.leads[0].company = 'Edited Co'), { label: 'test' });
    renderApp('/settings', 'ADMIN');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset demo data?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, reset' }));
    expect(await screen.findByText('Demo data reloaded.')).toBeInTheDocument();
    expect(db.getLeads()[0].company).not.toBe('Edited Co');
    expect(db.getAudit().at(-1)?.action).toBe('RESET');
  });

  it('previews an import, rejects a bad file and applies a good one', async () => {
    db.mutate((d) => void (d.collections.leads[0].company = 'Imported Co'), { label: 'test' });
    const good = new File([db.exportJson()], 'backup.json', { type: 'application/json' });
    db.resetDemoData({ id: 'USR-001', role: 'ADMIN' });
    renderApp('/settings', 'ADMIN');
    const input = screen.getByLabelText('Backup file to import');

    await userEvent.upload(input, new File(['{"a":1}'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('dialog', { name: 'This file cannot be imported' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    await userEvent.upload(input, good);
    const dialog = await screen.findByRole('dialog', { name: 'Import this backup?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace current data' }));
    expect(await screen.findByText(/Data imported/)).toBeInTheDocument();
    expect(db.getLeads()[0].company).toBe('Imported Co');
  });
});
