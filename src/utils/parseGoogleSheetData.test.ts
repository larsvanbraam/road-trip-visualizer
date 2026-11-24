import { describe, expect, it } from 'vite-plus/test';
import { parseGoogleSheetData } from './parseGoogleSheetData';

type Sheet = Parameters<typeof parseGoogleSheetData>[0];

const sheet = (data: Array<Record<string, unknown>>) => ({ id: 'Stops', data }) as Sheet;

describe('parseGoogleSheetData', () => {
  it('maps the sheet columns to road trip properties', () => {
    const result = parseGoogleSheetData(
      sheet([
        {
          Day: '1',
          Date: '2026-07-01',
          'Morning location (address)': 'Amsterdam',
          'Through (address)': 'Utrecht',
          'Evening location (address)': 'Brussels',
          'Distance (km)': '210 km',
          'Travel time': '2:30:00',
        },
      ]),
    );

    expect(result).toEqual([
      {
        dayNumber: '1',
        date: '2026-07-01',
        morningLocation: 'Amsterdam',
        afternoonLocation: 'Utrecht',
        eveningLocation: 'Brussels',
        distance: '210 km',
        time: '2:30:00',
      },
    ]);
  });

  it('ignores columns it does not know about', () => {
    const [stop] = parseGoogleSheetData(sheet([{ Day: '2', Hotel: 'Ibis', Notes: 'x' }]));

    expect(stop).toEqual({ dayNumber: '2' });
  });

  it('converts non-string cell values to strings', () => {
    const [stop] = parseGoogleSheetData(sheet([{ Day: 3, 'Distance (km)': 0 }]));

    expect(stop).toEqual({ dayNumber: '3', distance: '0' });
  });

  it('returns an empty trip for an empty sheet', () => {
    expect(parseGoogleSheetData(sheet([]))).toEqual([]);
  });
});
