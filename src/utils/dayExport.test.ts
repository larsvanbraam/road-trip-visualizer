import { describe, expect, it } from 'vite-plus/test';
import { RoadTrip } from '../types/roadTrip.types';
import { buildExportTargets, createZip, estimateSecondsLeft, readZip } from './dayExport';

const day = (dayNumber: string, from: string, to: string): RoadTrip[number] => ({
  dayNumber,
  date: '',
  morningLocation: from,
  afternoonLocation: '',
  eveningLocation: to,
  distance: '100 km',
  time: '1:00:00',
});

describe('buildExportTargets', () => {
  it('starts with the full trip and adds one target per day', () => {
    const targets = buildExportTargets([
      day('1', 'Amsterdam, Netherlands', 'Cologne, Germany'),
      day('3', 'Cologne, Germany', 'Zürich, Switzerland'),
    ]);

    expect(targets.map(({ dayNumber }) => dayNumber)).toEqual([undefined, '1', '3']);
    expect(targets.map(({ fileName }) => fileName)).toEqual([
      '00-full-trip.png',
      '01-day-1-amsterdam-netherlands-cologne-germany.png',
      '02-day-3-cologne-germany-zurich-switzerland.png',
    ]);
  });

  it('knows which route has to be drawn for each target', () => {
    const targets = buildExportTargets([day('1', 'A', 'B'), day('3', 'B', 'C')]);

    expect(targets.map(({ routeId }) => routeId)).toEqual(['1.3', '1.1', '3.3']);
  });

  it('describes the day in the label', () => {
    const [, target] = buildExportTargets([day('2', 'A', 'B')]);

    expect(target.label).toBe('Day 2: A → B');
  });

  it('keeps file names to a sensible length', () => {
    const long = 'Some very long address '.repeat(10);
    const [, target] = buildExportTargets([day('1', long, long)]);

    expect(target.fileName.length).toBeLessThan(90);
    expect(target.fileName.endsWith('.png')).toBe(true);
  });

  it('never produces the same file name twice', () => {
    const names = buildExportTargets([day('1', 'A', 'B'), day('1', 'A', 'B')]).map(
      ({ fileName }) => fileName,
    );

    expect(new Set(names).size).toBe(names.length);
  });

  it('only contains the full trip when there are no days', () => {
    expect(buildExportTargets([])).toHaveLength(1);
  });
});

describe('createZip', () => {
  it('contains every file with its contents', () => {
    const zip = createZip([
      { name: '00-full-trip.png', data: new Uint8Array([1, 2, 3]) },
      { name: '01-day-1.png', data: new Uint8Array([4, 5]) },
    ]);

    const files = readZip(zip);

    expect(Object.keys(files)).toEqual(['00-full-trip.png', '01-day-1.png']);
    expect(Array.from(files['00-full-trip.png'])).toEqual([1, 2, 3]);
    expect(Array.from(files['01-day-1.png'])).toEqual([4, 5]);
  });
});

describe('estimateSecondsLeft', () => {
  it('gives no estimate until enough screenshots are timed', () => {
    expect(estimateSecondsLeft({ timedSteps: 1, elapsedMs: 3000, remaining: 10 })).toBeUndefined();
  });

  it('multiplies the average time by the screenshots left, rounded to 5 seconds', () => {
    // 3 s per screenshot, 10 to go
    expect(estimateSecondsLeft({ timedSteps: 2, elapsedMs: 6000, remaining: 10 })).toBe(30);
    expect(estimateSecondsLeft({ timedSteps: 2, elapsedMs: 6200, remaining: 11 })).toBe(35);
  });

  it('never shows less than 5 seconds, and nothing when nothing is left', () => {
    expect(estimateSecondsLeft({ timedSteps: 3, elapsedMs: 3000, remaining: 1 })).toBe(5);
    expect(estimateSecondsLeft({ timedSteps: 3, elapsedMs: 3000, remaining: 0 })).toBeUndefined();
  });
});
