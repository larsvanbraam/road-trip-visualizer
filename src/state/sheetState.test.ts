import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// The store reads localStorage when the module is evaluated, so load it fresh for every test
async function loadStore() {
  vi.resetModules();
  return (await import('./sheetState')).useSheetStore;
}

describe('useSheetStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty without stored data', async () => {
    const store = await loadStore();

    expect(store.getState().sheetId).toBe('');
    expect(store.getState().sheetIds).toEqual([]);
  });

  it('restores data saved by the previous (Recoil) version', async () => {
    localStorage.setItem('active_sheet_id', JSON.stringify('abc'));
    localStorage.setItem('sheet_history', JSON.stringify(['abc', 'def']));

    const store = await loadStore();

    expect(store.getState().sheetId).toBe('abc');
    expect(store.getState().sheetIds).toEqual(['abc', 'def']);
  });

  it('falls back to defaults when stored data is corrupt', async () => {
    localStorage.setItem('active_sheet_id', '{not json');

    const store = await loadStore();

    expect(store.getState().sheetId).toBe('');
  });

  it('persists changes under the existing keys', async () => {
    const store = await loadStore();

    store.getState().setSheetId('xyz');
    store.getState().setSheetIds(['xyz']);

    expect(JSON.parse(localStorage.getItem('active_sheet_id')!)).toBe('xyz');
    expect(JSON.parse(localStorage.getItem('sheet_history')!)).toEqual(['xyz']);
  });

  it('supports updater functions for the history', async () => {
    const store = await loadStore();
    store.getState().setSheetIds(['a']);

    store.getState().setSheetIds((ids) => ['b', ...ids]);

    expect(store.getState().sheetIds).toEqual(['b', 'a']);
  });
});
