import { describe, expect, it } from 'vite-plus/test';
import {
  buildTimeline,
  MS_PER_DRIVE_HOUR,
  PAUSE_MS,
  ReplayDayInput,
  sampleTimeline,
} from './replayTimeline';

const day = (dayNumber: string, minutes: number, path: ReplayDayInput['path']): ReplayDayInput => ({
  dayNumber,
  date: '',
  from: 'A',
  to: 'B',
  km: minutes,
  minutes,
  path,
});

// About one degree of longitude per leg, straight along the equator
const leg = (start: number) => [
  { lat: 0, lng: start },
  { lat: 0, lng: start + 1 },
  { lat: 0, lng: start + 2 },
];

describe('buildTimeline', () => {
  it('gives every day time in proportion to its drive time, plus a pause', () => {
    const { segments, totalMs } = buildTimeline([day('1', 60, leg(0)), day('2', 120, leg(2))]);

    expect(segments[0].driveMs).toBe(MS_PER_DRIVE_HOUR);
    expect(segments[1].driveMs).toBe(2 * MS_PER_DRIVE_HOUR);
    expect(segments[1].startMs).toBe(MS_PER_DRIVE_HOUR + PAUSE_MS);
    expect(totalMs).toBe(3 * MS_PER_DRIVE_HOUR + 2 * PAUSE_MS);
  });

  it('does not let a short or unknown drive time vanish', () => {
    const { segments } = buildTimeline([day('1', 0, leg(0))]);

    expect(segments[0].driveMs).toBeGreaterThan(0);
  });

  it('leaves out days without a path', () => {
    expect(buildTimeline([day('1', 60, [])]).segments).toEqual([]);
  });
});

describe('sampleTimeline', () => {
  const timeline = buildTimeline([day('1', 60, leg(0)), day('2', 60, leg(2))]);

  it('has nothing to show for an empty timeline', () => {
    expect(sampleTimeline(buildTimeline([]), 0)).toBeUndefined();
  });

  it('starts at the beginning of the first day', () => {
    const sample = sampleTimeline(timeline, 0)!;

    expect(sample.position).toEqual({ lat: 0, lng: 0 });
    expect(sample.dayNumber).toBe('1');
    expect(sample.hasArrived).toBe(false);
  });

  it('is halfway along the path at half of the drive time', () => {
    const sample = sampleTimeline(timeline, MS_PER_DRIVE_HOUR / 2)!;

    expect(sample.position.lng).toBeCloseTo(1, 3);
    expect(sample.drivenKm).toBeCloseTo(30, 3);
    expect(sample.partialPath.at(-1)).toEqual(sample.position);
  });

  it('waits at the end of a day before leaving for the next', () => {
    const sample = sampleTimeline(timeline, MS_PER_DRIVE_HOUR + PAUSE_MS / 2)!;

    expect(sample.hasArrived).toBe(true);
    expect(sample.dayNumber).toBe('1');
    expect(sample.position.lng).toBeCloseTo(2, 3);
  });

  it('continues with the next day and counts what was driven before', () => {
    const sample = sampleTimeline(timeline, MS_PER_DRIVE_HOUR + PAUSE_MS + MS_PER_DRIVE_HOUR / 2)!;

    expect(sample.dayNumber).toBe('2');
    expect(sample.dayIndex).toBe(1);
    expect(sample.drivenKm).toBeCloseTo(90, 3);
    expect(sample.drivenMinutes).toBeCloseTo(90, 3);
  });

  it('stays at the end when time runs past the timeline', () => {
    const sample = sampleTimeline(timeline, timeline.totalMs + 10_000)!;

    expect(sample.position).toEqual({ lat: 0, lng: 4 });
    expect(sample.hasArrived).toBe(true);
    expect(sample.drivenKm).toBe(120);
  });
});
