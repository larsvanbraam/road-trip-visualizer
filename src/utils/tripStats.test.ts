import { describe, expect, it } from 'vite-plus/test';
import { RoadTrip } from '../types/roadTrip.types';
import {
  formatDuration,
  formatTripDate,
  getTripStats,
  parseDistanceKm,
  parseDurationMinutes,
  parseViaStops,
  isSheetError,
  toSheetDuration,
} from './tripStats';

describe('parseDistanceKm', () => {
  it('reads the number from a distance value', () => {
    expect(parseDistanceKm('210 km')).toBe(210);
    expect(parseDistanceKm('12.5 km')).toBe(12.5);
    expect(parseDistanceKm('1,234 km')).toBe(1234);
  });

  it('returns 0 for empty or invalid values', () => {
    expect(parseDistanceKm('')).toBe(0);
    expect(parseDistanceKm('n/a')).toBe(0);
  });
});

describe('parseDurationMinutes', () => {
  it('reads h:mm:ss and h:mm', () => {
    expect(parseDurationMinutes('2:30:00')).toBe(150);
    expect(parseDurationMinutes('2:30')).toBe(150);
    expect(parseDurationMinutes('0:00:30')).toBe(0.5);
  });

  it('returns 0 for values it does not understand', () => {
    expect(parseDurationMinutes('')).toBe(0);
    expect(parseDurationMinutes('soon')).toBe(0);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h'],
    [150, '2 h 30 min'],
    [29.6, '30 min'],
    [60 * 51 + 10, '2 d 3 h'],
  ])('formats %d minutes as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('getTripStats', () => {
  const stop = (distance: string, time: string): RoadTrip[number] => ({
    dayNumber: '1',
    date: '',
    morningLocation: '',
    afternoonLocation: '',
    eveningLocation: '',
    distance,
    time,
  });

  it('sums distance and drive time', () => {
    expect(getTripStats([stop('100 km', '1:30:00'), stop('50 km', '0:45:00')])).toEqual({
      days: 2,
      distanceKm: 150,
      driveMinutes: 135,
    });
  });

  it('handles an empty trip', () => {
    expect(getTripStats([])).toEqual({ days: 0, distanceKm: 0, driveMinutes: 0 });
  });
});

describe('formatTripDate', () => {
  it('formats an ISO date', () => {
    expect(formatTripDate('2026-07-01')).toBe('Wed, Jul 1');
  });

  it('keeps values it cannot read', () => {
    expect(formatTripDate('1 July')).toBe('1 July');
    expect(formatTripDate('')).toBe('');
    expect(formatTripDate('2026-13-45')).toBe('2026-13-45');
  });
});

describe('parseViaStops', () => {
  it('splits the stops on a pipe and ignores blanks', () => {
    expect(parseViaStops('Utrecht | Arnhem||')).toEqual(['Utrecht', 'Arnhem']);
  });

  it('returns nothing for an empty value', () => {
    expect(parseViaStops('')).toEqual([]);
  });
});

describe('isSheetError', () => {
  it('recognises the errors a sheet formula leaves in a cell', () => {
    expect(isSheetError('#ERROR!')).toBe(true);
    expect(isSheetError('#N/A')).toBe(true);
    expect(isSheetError('218 km')).toBe(false);
    expect(isSheetError('')).toBe(false);
    expect(isSheetError(undefined)).toBe(false);
  });
});

describe('toSheetDuration', () => {
  it('writes minutes like the sheet and can be read back', () => {
    expect(toSheetDuration(392.9667)).toBe('6:32:58');
    expect(toSheetDuration(45)).toBe('0:45:00');
    expect(parseDurationMinutes(toSheetDuration(150))).toBe(150);
  });
});
