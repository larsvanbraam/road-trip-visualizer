/**
 * Put the given sheet id first in the history, without creating duplicates
 */
export function promoteSheetId(sheetIds: Array<string>, sheetId: string): Array<string> {
  return [sheetId, ...sheetIds.filter((value) => value !== sheetId)];
}
