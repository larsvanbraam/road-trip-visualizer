/**
 * The name of a trip, taken from the title of the spreadsheet. Google prefixes the title of a copy
 * with "Copy of", which says nothing about the trip.
 */
export function cleanSheetTitle(title: string): string {
  return title.replace(/^copy of\s+/i, '').trim();
}
