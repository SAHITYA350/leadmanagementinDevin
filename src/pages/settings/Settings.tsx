import { useRef, useState } from 'react';
import { Database as DbIcon, Download, RotateCcw, Upload } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import type { ImportPreview } from '@/services/db';
import { exportData, importData, previewImport, resetData, storageInfo } from '@/services/dataTools';
import { useDataStore } from '@/store/data';
import { useCan, useCurrentUser, useSessionStore } from '@/store/session';
import { errorMessage, toast } from '@/store/ui';
import { downloadText, readFileText } from '@/utils/download';
import { humanize } from '@/utils/labels';

const NO_ACCESS = 'Only Admin can do this.';
const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

export default function Settings() {
  const user = useCurrentUser();
  const syncSession = useSessionStore((s) => s.sync);
  const db = useDataStore((s) => s.db);
  const canExport = useCan('settings.export');
  const canImport = useCan('settings.import');
  const canReset = useCan('settings.reset');
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<(ImportPreview & { fileName: string }) | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const info = storageInfo();
  const counts = Object.entries(db.collections).filter(([name]) => name !== 'actions');

  const run = (fn: () => void, done: string) => {
    setBusy(true);
    try {
      fn();
      syncSession();
      toast.success(done);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onExport = () =>
    run(() => {
      const file = exportData(user);
      downloadText(file.filename, file.json);
    }, 'Backup file downloaded.');

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      setPreview({ ...previewImport(user, await readFileText(file)), fileName: file.name });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onImport = () => {
    const data = preview?.db;
    setPreview(null);
    if (data) run(() => importData(user, data), 'Data imported. A backup of the previous data was kept.');
  };

  const onReset = () => {
    setConfirmReset(false);
    run(() => resetData(user), 'Demo data reloaded.');
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your data lives only in this browser. Export a backup before you clear browser data or switch computers."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Data"
            description="All three actions work on the same saved data."
            icon={<DbIcon className="size-5" />}
          />
          <div className="divide-y divide-slate-100 px-5 pt-2 pb-2">
            <Row title="Export JSON" text="Download everything as one backup file.">
              <Button
                variant="secondary"
                icon={<Download className="size-4" />}
                onClick={onExport}
                loading={busy}
                disabledReason={canExport ? null : NO_ACCESS}
              >
                Export
              </Button>
            </Row>
            <Row
              title="Import JSON"
              text="Replace the current data with a backup file. You will see what is inside before anything changes."
            >
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Backup file to import"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button
                variant="secondary"
                icon={<Upload className="size-4" />}
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                disabledReason={canImport ? null : NO_ACCESS}
              >
                Import
              </Button>
            </Row>
            <Row
              title="Reset demo data"
              text="Throw away all changes and reload the sample data. A backup of the current data is kept in this browser."
            >
              <Button
                variant="danger"
                icon={<RotateCcw className="size-4" />}
                onClick={() => setConfirmReset(true)}
                disabled={busy}
                disabledReason={canReset ? null : NO_ACCESS}
              >
                Reset
              </Button>
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Saved in this browser" description={`Storage key ${info.key}`} />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 pt-4 pb-5 text-sm">
            {counts.map(([name, rows]) => (
              <div key={name} className="flex justify-between gap-2">
                <dt className="text-slate-600">{humanize(name)}</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{rows.length}</dd>
              </div>
            ))}
            <div className="col-span-2 mt-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Using {kb(info.bytes)} of about {kb(info.limit)}.{' '}
              {info.hasBackup ? 'A backup of the previous data is saved.' : 'No backup saved yet.'}
            </div>
          </dl>
        </Card>
      </div>

      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.ok ? 'Import this backup?' : 'This file cannot be imported'}
        description={preview?.fileName}
        footer={
          preview?.ok ? (
            <>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button onClick={onImport}>Replace current data</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
          )
        }
      >
        {preview?.ok ? (
          <>
            <p className="text-sm text-slate-600">
              This replaces everything currently saved. The current data is kept as a backup first.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {Object.entries(preview.counts)
                .filter(([name]) => name !== 'actions')
                .map(([name, n]) => (
                  <div key={name} className="flex justify-between gap-2">
                    <dt className="text-slate-600">{humanize(name)}</dt>
                    <dd className="font-medium tabular-nums">{n}</dd>
                  </div>
                ))}
            </dl>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Nothing was changed. Fix these problems or choose a file exported from this app.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
              {preview?.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </>
        )}
      </Dialog>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        description="All leads, quotations, orders and payments you changed will go back to the sample data. A backup of the current data is kept in this browser."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onReset}>
              Yes, reset
            </Button>
          </>
        }
      />
    </>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-600">{text}</p>
      </div>
      {children}
    </div>
  );
}
