// Settings -> Data: Export / Import / Reset, all on the localStorage key yash_erp_local_v1.
import type { Database, User } from '@/db/types';
import { istDayKey } from '@/utils/ist';
import * as db from './db';
import { assertCan } from './permissions';

const actorOf = (user: User) => ({ id: user.id, role: user.role });

export function exportData(user: User): { filename: string; json: string } {
  assertCan(user.role, 'settings.export', 'Only Admin can export data.');
  const json = db.exportJson(actorOf(user));
  return { filename: `yash-erp-backup-${istDayKey(Date.now())}.json`, json };
}

/** Checks a file without changing anything, so the user can confirm what will be imported. */
export function previewImport(user: User, text: string): db.ImportPreview {
  assertCan(user.role, 'settings.import', 'Only Admin can import data.');
  return db.previewImport(text);
}

export function importData(user: User, data: Database): void {
  assertCan(user.role, 'settings.import', 'Only Admin can import data.');
  db.importDatabase(data, actorOf(user));
}

export function resetData(user: User): void {
  assertCan(user.role, 'settings.reset', 'Only Admin can reset demo data.');
  db.resetDemoData(actorOf(user));
}

export function storageInfo() {
  return { ...db.storageUsage(), key: db.STORAGE_KEY, hasBackup: db.hasBackup() };
}
