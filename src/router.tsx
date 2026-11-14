import { Navigate, Route, Routes } from 'react-router-dom';
import { RequirePermission } from '@/components/common/RequirePermission';
import { AppLayout } from '@/components/layout/AppLayout';
import { NAV_ITEMS } from '@/components/layout/nav';
import Admin from '@/pages/admin/Admin';
import Dashboard from '@/pages/Dashboard';
import ModulePlaceholder from '@/pages/ModulePlaceholder';
import NotFound from '@/pages/NotFound';
import Settings from '@/pages/settings/Settings';
import Team from '@/pages/Team';

const PAGES: Record<string, React.ReactNode> = {
  '/dashboard': <Dashboard />,
  '/team': <Team />,
  '/admin': <Admin />,
  '/settings': <Settings />,
};

/** Every route is wrapped in the same can() guard that filters the sidebar. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/leads" element={<Navigate to="/leads/inbox" replace />} />
        {NAV_ITEMS.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <RequirePermission permission={item.permission}>
                {PAGES[item.path] ?? <ModulePlaceholder item={item} />}
              </RequirePermission>
            }
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
