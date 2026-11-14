import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { privateFor, type Permission } from '@/services/permissions';
import { useCurrentUser } from '@/store/session';
import { ROLE_LABEL } from '@/utils/labels';

export default function AccessDenied({ permission }: { permission: Permission }) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'));

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Lock className="size-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          This section is private for {privateFor(permission)}. Contact Admin if you need access.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          You are viewing as {user.name} ({ROLE_LABEL[user.role]}).
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={goBack}>
            Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>Open Dashboard</Button>
        </div>
      </Card>
    </div>
  );
}
