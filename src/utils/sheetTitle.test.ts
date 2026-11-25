import { describe, expect, it } from 'vite-plus/test';
import { cleanSheetTitle } from './sheetTitle';

describe('cleanSheetTitle', () => {
  it('keeps a normal title', () => {
    expect(cleanSheetTitle('West coast 2026')).toBe('West coast 2026');
  });

  it('removes the prefix Google adds to a copy', () => {
    expect(cleanSheetTitle('Copy of Road Trip Template')).toBe('Road Trip Template');
    expect(cleanSheetTitle('copy of  Italy')).toBe('Italy');
  });

  it('trims whitespace', () => {
    expect(cleanSheetTitle('  Italy  ')).toBe('Italy');
  });
});
