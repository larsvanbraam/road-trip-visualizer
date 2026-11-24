import { create } from 'zustand';

const SHEET_ID_KEY = 'active_sheet_id';
const SHEET_IDS_KEY = 'sheet_history';

/**
 * Read a JSON value from localStorage, falling back when it is missing or unreadable
 */
function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or unavailable (private mode), the app keeps working in memory
  }
}

type SheetState = {
  /** The sheet that is currently visualised */
  sheetId: string;
  /** History of previously used sheets */
  sheetIds: Array<string>;
  setSheetId: (sheetId: string) => void;
  setSheetIds: (sheetIds: Array<string> | ((sheetIds: Array<string>) => Array<string>)) => void;
};

export const useSheetStore = create<SheetState>((set) => ({
  sheetId: readStorage(SHEET_ID_KEY, ''),
  sheetIds: readStorage<Array<string>>(SHEET_IDS_KEY, []),
  setSheetId: (sheetId) => set({ sheetId }),
  setSheetIds: (sheetIds) =>
    set((state) => ({
      sheetIds: typeof sheetIds === 'function' ? sheetIds(state.sheetIds) : sheetIds,
    })),
}));

// Persist under the same keys and format as before so existing users keep their history
useSheetStore.subscribe((state, previous) => {
  if (state.sheetId !== previous.sheetId) writeStorage(SHEET_ID_KEY, state.sheetId);
  if (state.sheetIds !== previous.sheetIds) writeStorage(SHEET_IDS_KEY, state.sheetIds);
});
