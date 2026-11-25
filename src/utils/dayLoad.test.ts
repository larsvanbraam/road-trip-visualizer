import { describe, expect, it } from 'vite-plus/test';
import { getDayLoads, getLoadLevel } from './dayLoad';

describe('getLoadLevel', () => {
  it.each([
    [0, 'comfortable'],
    [240, 'comfortable'],
    [241, 'long'],
    [360, 'long'],
    [361, 'heavy'],
  ] as const)('rates %d minutes as %s', (minutes, expected) => {
    expect(getLoadLevel(minutes)).toBe(expected);
  });
});

describe('getDayLoads', () => {
  const day = (dayNumber: string, distance: string, time: string) => ({
    dayNumber,
    date: '2026-07-01',
    morningLocation: '',
    afternoonLocation: '',
    eveningLocation: '',
    distance,
    time,
  });

  it('reads the distance and drive time of every day', () => {
    const [first] = getDayLoads([day('1', '420 km', '4:30:00')]);

    expect(first).toMatchObject({ dayNumber: '1', km: 420, minutes: 270, level: 'long' });
    expect(first.isRestDay).toBe(false);
  });

  it('keeps rest days in the list', () => {
    const loads = getDayLoads([day('1', '100 km', '1:00'), day('2', '', '')]);

    expect(loads).toHaveLength(2);
    expect(loads[1].isRestDay).toBe(true);
    expect(loads[1].minutes).toBe(0);
  });
});
