import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message="This address does not match any screen. Use the menu on the left or go back to the dashboard."
        action={<Button onClick={() => navigate('/dashboard')}>Open Dashboard</Button>}
      />
    </Card>
  );
}
