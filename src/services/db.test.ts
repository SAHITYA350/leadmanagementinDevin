import { describe, expect, it } from 'vitest';
import { appendAudit } from '@/db/helpers';
import { checkInvariants, validateDatabase } from '@/db/validate';
import * as db from './db';

const admin = { id: 'USR-001', role: 'ADMIN' as const };
const stored = () => JSON.parse(localStorage.getItem(db.STORAGE_KEY) as string);
const refresh = () => db.__resetForTests();

describe('seed', () => {
  it('seeds from src/data/*.json into yash_erp_local_v1 when storage is empty', () => {
    expect(localStorage.getItem('yash_erp_local_v1')).toBeNull();
    expect(db.init().outcome).toBe('seeded');
    const c = stored().collections;
    expect(c.users).toHaveLength(6);
    expect(c.products).toHaveLength(6);
    expect(c.leads).toHaveLength(60);
    expect(new Set(c.leads.map((l: { companyKey: string }) => l.companyKey)).size).toBe(25);
    expect(c.quotes).toHaveLength(15);
    expect(c.orders).toHaveLength(12);
    expect(c.invoices).toHaveLength(8);
    expect(c.recovery).toHaveLength(10);
    expect(c.targets.length).toBeGreaterThan(0);
    expect(c.audit.length).toBeGreaterThan(0);
  });

  it('produces a database that passes validation and every invariant', () => {
    const state = db.getState();
    expect(validateDatabase(structuredClone(state)).ok).toBe(true);
    expect(checkInvariants(state)).toEqual([]);
  });

  it('shifts seed dates so the newest lead is recent', () => {
    const now = Date.parse('2030-01-15T06:30:00.000Z');
    db.init(now);
    const newest = Math.max(...db.getLeads().map((l) => Date.parse(l.createdAt)));
    expect(now - newest).toBeLessThan(2 * 86_400_000);
    expect(newest).toBeLessThanOrEqual(now);
  });
});

describe('persistence', () => {
  it('keeps changes across a refresh and does not reseed', () => {
    db.mutate((d) => void (d.collections.leads[0].company = 'Changed Co'), { label: 'test' });
    refresh();
    expect(db.init().outcome).toBe('loaded');
    expect(db.getLeads()[0].company).toBe('Changed Co');
  });

  it('saves nothing when a change throws', () => {
    const before = db.getState().revision;
    expect(() =>
      db.mutate(
        (d) => {
          d.collections.leads[0].company = 'Half done';
          throw new Error('boom');
        },
        { label: 'test' },
      ),
    ).toThrow('boom');
    expect(db.getState().revision).toBe(before);
    expect(stored().collections.leads[0].company).not.toBe('Half done');
  });

  it('rejects a change that breaks an invariant', () => {
    expect(() =>
      db.mutate((d) => void (d.collections.products[0].reserved = d.collections.products[0].onHand + 1), {
        label: 'test',
      }),
    ).toThrow(db.DbError);
    refresh();
    const p = db.getProducts()[0];
    expect(p.reserved).toBeLessThanOrEqual(p.onHand);
  });

  it('runs a repeated actionId only once', () => {
    const before = db.getProducts()[0].onHand;
    const run = () =>
      db.mutate((d) => (d.collections.products[0].onHand += 5), { label: 'stock', actionId: 'act-1' });
    expect(run()).toBe(before + 5);
    expect(run()).toBe(before + 5);
    refresh();
    expect(run()).toBe(before + 5);
    expect(db.getProducts()[0].onHand).toBe(before + 5);
  });

  it('notifies subscribers after a write', () => {
    const seen: number[] = [];
    const off = db.subscribe((s) => seen.push(s.revision));
    db.mutate(
      (d) =>
        void appendAudit(d, {
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'UPDATE',
          entityType: 'x',
          entityId: '1',
        }),
      { label: 't' },
    );
    off();
    expect(seen).toEqual([db.getState().revision]);
  });
});

describe('recovery', () => {
  it('restores the backup when saved data is damaged', () => {
    db.mutate((d) => void (d.collections.leads[0].company = 'Before reset'), { label: 'test' });
    db.resetDemoData(admin);
    localStorage.setItem(db.STORAGE_KEY, '{not json');
    refresh();
    expect(db.init().outcome).toBe('restored-backup');
    expect(db.getLeads()[0].company).toBe('Before reset');
  });

  it('reseeds when the data is damaged and there is no backup', () => {
    localStorage.setItem(db.STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    const notice = db.init();
    expect(notice.outcome).toBe('reseeded-corrupt');
    expect(notice.message).toMatch(/demo data was reloaded/);
    expect(db.getLeads()).toHaveLength(60);
  });

  it('reseeds instead of crashing when a saved record is missing a nested field', () => {
    db.init();
    const damaged = stored();
    delete damaged.collections.invoices[0].totals;
    expect(validateDatabase(structuredClone(damaged)).ok).toBe(false);
    localStorage.setItem(db.STORAGE_KEY, JSON.stringify(damaged));
    refresh();
    expect(db.init().outcome).toBe('reseeded-corrupt');
    expect(db.previewImport(JSON.stringify(damaged)).ok).toBe(false);
  });
});

describe('data tools', () => {
  it('ignores stale counters in an imported file so new ids never repeat', () => {
    db.exportJson(admin);
    const file = JSON.parse(db.exportJson(admin));
    file.sequences.AU -= 1;
    const preview = db.previewImport(JSON.stringify(file));
    expect(preview.ok).toBe(true);
    db.importDatabase(preview.db!, admin);
    refresh();
    expect(db.init().outcome).toBe('loaded');
    const ids = db.getAudit().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(db.getAudit().at(-1)?.action).toBe('IMPORT');
  });

  it('export then import brings back the same data', () => {
    db.mutate((d) => void (d.collections.leads[0].company = 'Exported Co'), { label: 'test' });
    const json = db.exportJson(admin);
    db.resetDemoData(admin);
    expect(db.getLeads()[0].company).not.toBe('Exported Co');
    const preview = db.previewImport(json);
    expect(preview.ok).toBe(true);
    expect(preview.counts.leads).toBe(60);
    db.importDatabase(preview.db!, admin);
    refresh();
    expect(db.getLeads()[0].company).toBe('Exported Co');
    expect(db.getAudit().at(-1)?.action).toBe('IMPORT');
  });

  it('refuses a file that is not a backup and changes nothing', () => {
    const before = localStorage.getItem(db.STORAGE_KEY) ?? (db.init(), localStorage.getItem(db.STORAGE_KEY));
    expect(db.previewImport('not json')).toMatchObject({
      ok: false,
      errors: ['This file is not valid JSON.'],
    });
    const bad = db.previewImport(JSON.stringify({ schemaVersion: 1, collections: {} }));
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(localStorage.getItem(db.STORAGE_KEY)).toBe(before);
  });

  it('reset reloads the seed, keeps a backup and writes an audit entry', () => {
    db.mutate((d) => void (d.collections.leads[0].company = 'Edited'), { label: 'test' });
    expect(db.hasBackup()).toBe(false);
    db.resetDemoData(admin);
    expect(db.hasBackup()).toBe(true);
    expect(db.getLeads()[0].company).not.toBe('Edited');
    expect(db.getAudit().at(-1)).toMatchObject({ action: 'RESET', actorId: 'USR-001' });
    expect(db.storageUsage().bytes).toBeLessThan(db.STORAGE_LIMIT_BYTES);
  });
});
