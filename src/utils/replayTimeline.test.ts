import { describe, expect, it } from 'vite-plus/test';
import {
  buildTimeline,
  MIN_DRIVE_MS,
  MS_PER_KM,
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

// Straight along the equator, where a degree of longitude is about 111 km
const leg = (start: number, degrees = 2) =>
  Array.from({ length: degrees + 1 }, (_, index) => ({ lat: 0, lng: start + index }));

const KM_PER_DEGREE = (2 * Math.PI * 6_371) / 360;
/** What a leg of two degrees takes */
const LEG_MS = 2 * KM_PER_DEGREE * MS_PER_KM;

describe('buildTimeline', () => {
  it('gives every day time in proportion to the length of its route, plus a pause', () => {
    const { segments, totalMs } = buildTimeline([day('1', 60, leg(0)), day('2', 120, leg(2, 4))]);

    expect(segments[0].driveMs).toBeCloseTo(LEG_MS, 3);
    expect(segments[1].driveMs).toBeCloseTo(2 * LEG_MS, 3);
    expect(segments[1].startMs).toBeCloseTo(LEG_MS + PAUSE_MS, 3);
    expect(totalMs).toBeCloseTo(3 * LEG_MS + 2 * PAUSE_MS, 3);
  });

  it('keeps the same speed whatever the drive time in the sheet says', () => {
    const [slow, unknown] = buildTimeline([day('1', 600, leg(0)), day('2', 0, leg(2))]).segments;

    expect(slow.driveMs).toBeCloseTo(unknown.driveMs, 3);
  });

  it('does not let a very short drive vanish', () => {
    const { segments } = buildTimeline([day('1', 0, [{ lat: 0, lng: 0 }])]);

    expect(segments[0].driveMs).toBe(MIN_DRIVE_MS);
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
    const sample = sampleTimeline(timeline, LEG_MS / 2)!;

    expect(sample.position.lng).toBeCloseTo(1, 3);
    expect(sample.drivenKm).toBeCloseTo(30, 3);
    expect(sample.partialPath.at(-1)).toEqual(sample.position);
  });

  it('waits at the end of a day before leaving for the next', () => {
    const sample = sampleTimeline(timeline, LEG_MS + PAUSE_MS / 2)!;

    expect(sample.hasArrived).toBe(true);
    expect(sample.dayNumber).toBe('1');
    expect(sample.position.lng).toBeCloseTo(2, 3);
  });

  it('continues with the next day and counts what was driven before', () => {
    const sample = sampleTimeline(timeline, LEG_MS + PAUSE_MS + LEG_MS / 2)!;

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
