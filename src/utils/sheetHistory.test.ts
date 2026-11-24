import { describe, expect, it } from 'vite-plus/test';
import { promoteSheetId } from './sheetHistory';

describe('promoteSheetId', () => {
  it('adds a new id to the front', () => {
    expect(promoteSheetId(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('moves an existing id to the front without duplicating it', () => {
    expect(promoteSheetId(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('keeps the order when the id is already first', () => {
    expect(promoteSheetId(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });

  it('does not mutate the input', () => {
    const input = ['a', 'b'];
    promoteSheetId(input, 'b');

    expect(input).toEqual(['a', 'b']);
  });
});
