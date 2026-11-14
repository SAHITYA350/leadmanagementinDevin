import { useNavigate } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { NavItem } from '@/components/layout/nav';

/** Honest stand-in for screens that arrive in a later phase. The route and its permission guard are already live. */
export default function ModulePlaceholder({ item }: { item: NavItem }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title={item.label} description={item.about} />
      <Card>
        <EmptyState
          icon={Hammer}
          title={`This screen is built in Phase ${item.phase}`}
          message="Phase 1 covers the app shell, the local data store, roles and permissions. The sample data for this screen is already saved in your browser."
          action={
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          }
        />
      </Card>
    </>
  );
}
