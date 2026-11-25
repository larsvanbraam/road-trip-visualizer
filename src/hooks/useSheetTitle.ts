import { useEffect, useState } from 'react';
import { env } from '../config/env';
import { cleanSheetTitle } from '../utils/sheetTitle';

/**
 * The name of the spreadsheet, which is the name of the trip. Nothing is shown when it cannot be
 * read, because the trip works without a name.
 */
export function useSheetTitle(sheetId: string): string | undefined {
  const [state, setState] = useState<{ sheetId: string; title: string }>();

  useEffect(() => {
    if (!sheetId) return;

    const controller = new AbortController();
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`);
    url.searchParams.set('fields', 'properties.title');
    url.searchParams.set('key', env.googleApiKey);

    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((body: { properties?: { title?: string } } | undefined) => {
        const title = body?.properties?.title;
        if (title) setState({ sheetId, title: cleanSheetTitle(title) });
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [sheetId]);

  // A title that belongs to a sheet that is no longer shown must not linger
  return state?.sheetId === sheetId ? state.title || undefined : undefined;
}
