// Mirror of the localStorage database. Components read from here; writes go through services -> db.ts.
import { create } from 'zustand';
import type { Database } from '@/db/types';
import * as db from '@/services/db';

interface DataState {
  db: Database;
  notice: db.LoadNotice;
}

const notice = db.init();

export const useDataStore = create<DataState>(() => ({ db: db.getState(), notice }));

db.subscribe((next) => useDataStore.setState({ db: next }));

/** Re-read after tests or a hard reload of the underlying key. */
export function reloadDataStore(): void {
  const next = db.init();
  useDataStore.setState({ db: db.getState(), notice: next });
}

export const useCollection = <K extends keyof Database['collections']>(name: K) =>
  useDataStore((s) => s.db.collections[name]);
export const useSettings = () => useDataStore((s) => s.db.settings);
