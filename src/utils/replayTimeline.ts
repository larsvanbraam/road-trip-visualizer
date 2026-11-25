export type LatLng = { lat: number; lng: number };

export type ReplayDayInput = {
  dayNumber: string;
  date: string;
  from: string;
  to: string;
  /** What the sheet says the day is, so the numbers match the rest of the app */
  km: number;
  minutes: number;
  path: Array<LatLng>;
};

export type ReplaySegment = ReplayDayInput & {
  /** When the car leaves, how long it drives, and when the pause at the stop is over */
  startMs: number;
  driveMs: number;
  endMs: number;
  /** Meters from the start of the path to every point of it */
  cumulative: Array<number>;
  length: number;
};

export type ReplayTimeline = {
  segments: Array<ReplaySegment>;
  totalMs: number;
};

/**
 * Every kilometer of road takes this long in the replay, at normal speed. The time follows the
 * length of the path and not the drive time of the sheet, so the car moves at the same speed
 * everywhere: a slow mountain road or a day without a drive time must not look like a dash.
 */
export const MS_PER_KM = 9;
/** The car stays at the end of a day for a moment, so every stop is noticed */
export const PAUSE_MS = 800;
// Short drives would be over before they are seen
export const MIN_DRIVE_MS = 500;

const EARTH_RADIUS_M = 6_371_000;

function distanceBetween(a: LatLng, b: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Lay the days out on one timeline. Time is proportional to the length of the route of a day, so a
 * long day takes visibly longer than a short one and the car keeps the same speed. Days without a path are left out.
 */
export function buildTimeline(days: Array<ReplayDayInput>): ReplayTimeline {
  const segments: Array<ReplaySegment> = [];
  let cursor = 0;

  days.forEach((day) => {
    if (day.path.length === 0) return;

    // A single point has no length, a second one keeps the maths simple
    const path = day.path.length === 1 ? [day.path[0], day.path[0]] : day.path;
    const cumulative = path.reduce<Array<number>>((total, point, index) => {
      total.push(index === 0 ? 0 : total[index - 1] + distanceBetween(path[index - 1], point));
      return total;
    }, []);

    const length = cumulative[cumulative.length - 1];
    const driveMs = Math.max((length / 1000) * MS_PER_KM, MIN_DRIVE_MS);

    segments.push({
      ...day,
      path,
      startMs: cursor,
      driveMs,
      endMs: cursor + driveMs + PAUSE_MS,
      cumulative,
      length,
    });
    cursor += driveMs + PAUSE_MS;
  });

  return { segments, totalMs: cursor };
}

export type ReplaySample = {
  position: LatLng;
  dayIndex: number;
  dayNumber: string;
  /** The car is at the end of the day, waiting for the next one */
  hasArrived: boolean;
  /** The part of the current day that is driven, ending at the car */
  partialPath: Array<LatLng>;
  drivenKm: number;
  drivenMinutes: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Where the car is, and what has been driven, at the given moment of the timeline
 */
export function sampleTimeline(
  timeline: ReplayTimeline,
  elapsedMs: number,
): ReplaySample | undefined {
  const { segments, totalMs } = timeline;

  if (segments.length === 0) return undefined;

  const time = clamp(elapsedMs, 0, totalMs);
  const found = segments.findIndex(({ endMs }) => time < endMs);
  const dayIndex = found === -1 ? segments.length - 1 : found;
  const segment = segments[dayIndex];

  const local = time - segment.startMs;
  const progress = clamp(local / segment.driveMs, 0, 1);
  const target = progress * segment.length;

  // The last point that is not further along than the car
  let low = 0;
  let high = segment.cumulative.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (segment.cumulative[middle] <= target) low = middle;
    else high = middle - 1;
  }

  const from = segment.path[low];
  const to = segment.path[Math.min(low + 1, segment.path.length - 1)];
  const span =
    segment.cumulative[Math.min(low + 1, segment.path.length - 1)] - segment.cumulative[low];
  const ratio = span > 0 ? (target - segment.cumulative[low]) / span : 0;
  const position = {
    lat: from.lat + (to.lat - from.lat) * ratio,
    lng: from.lng + (to.lng - from.lng) * ratio,
  };

  const previous = segments.slice(0, dayIndex);

  return {
    position,
    dayIndex,
    dayNumber: segment.dayNumber,
    hasArrived: local >= segment.driveMs,
    partialPath: [...segment.path.slice(0, low + 1), position],
    drivenKm: previous.reduce((total, { km }) => total + km, 0) + segment.km * progress,
    drivenMinutes:
      previous.reduce((total, { minutes }) => total + minutes, 0) + segment.minutes * progress,
  };
}
