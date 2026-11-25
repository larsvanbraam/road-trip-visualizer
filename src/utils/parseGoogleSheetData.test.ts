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
    const [stop] = parseGoogleSheetData(
      sheet([{ Day: '2', 'Morning location (address)': 'Ghent', Hotel: 'Ibis', Notes: 'x' }]),
    );

    expect(stop).toMatchObject({ dayNumber: '2', morningLocation: 'Ghent' });
    expect(stop).not.toHaveProperty('Hotel');
  });

  it('fills columns the sheet left out with empty strings', () => {
    const [stop] = parseGoogleSheetData(
      sheet([{ Day: '4', 'Morning location (address)': 'Ghent' }]),
    );

    expect(stop.distance).toBe('');
    expect(stop.time).toBe('');
  });

  it('converts non-string cell values to strings', () => {
    const [stop] = parseGoogleSheetData(
      sheet([{ Day: 3, 'Morning location (address)': 'Ghent', 'Distance (km)': 0 }]),
    );

    expect(stop).toMatchObject({ dayNumber: '3', morningLocation: 'Ghent', distance: '0' });
  });

  it('returns an empty trip for an empty sheet', () => {
    expect(parseGoogleSheetData(sheet([]))).toEqual([]);
  });

  it('leaves out empty rows at the end of the sheet', () => {
    const result = parseGoogleSheetData(
      sheet([
        { Day: '1', 'Morning location (address)': 'Amsterdam', 'Distance (km)': '100 km' },
        { Day: '2', Date: '2026-07-02' },
        { Day: '3', 'Morning location (address)': '   ' },
      ]),
    );

    expect(result).toHaveLength(1);
  });

  it('keeps rest days and empty rows between planned days', () => {
    const result = parseGoogleSheetData(
      sheet([
        { Day: '1', 'Morning location (address)': 'Amsterdam', 'Distance (km)': '100 km' },
        { Day: '2' },
        { Day: '3', 'Morning location (address)': 'Brussels' },
        { Day: '4' },
      ]),
    );

    expect(result.map(({ dayNumber }) => dayNumber)).toEqual(['1', '2', '3']);
  });

  it('treats pre-filled zero distances and times as empty', () => {
    const result = parseGoogleSheetData(
      sheet([
        { Day: '1', 'Morning location (address)': 'Amsterdam' },
        { Day: '2', 'Distance (km)': '0 km', 'Travel time': '0:00:00' },
      ]),
    );

    expect(result).toHaveLength(1);
  });
});
