import { unzipSync, zipSync } from 'fflate';
import { RoadTrip, RoadTripStop } from '../types/roadTrip.types';
import { getRouteId } from './routeId';
import { toKebabCase } from './toKebabCase';

export type ExportTarget = {
  /** The day to show on the map, or undefined for the whole trip */
  dayNumber?: string;
  /** The id of the route that has to be drawn before the screenshot, see getRouteId */
  routeId: string;
  /** Shown in the progress card */
  label: string;
  fileName: string;
};

export type ExportFile = {
  name: string;
  data: Uint8Array;
};

const MAX_NAME_LENGTH = 80;
/** The first screenshots are slower (loading the library, resizing the map), so they are not counted */
const MIN_TIMED_STEPS = 2;
const ETA_ROUNDING_S = 5;

/**
 * A rough estimate of the seconds left, from how long the screenshots after the first one took.
 * Nothing is returned until there are enough of them, because an early guess would be far off.
 */
export function estimateSecondsLeft({
  timedSteps,
  elapsedMs,
  remaining,
}: {
  /** Screenshots finished since the timing started */
  timedSteps: number;
  elapsedMs: number;
  /** Screenshots still to take, including the one in progress */
  remaining: number;
}): number | undefined {
  if (timedSteps < MIN_TIMED_STEPS || remaining <= 0) return undefined;

  const seconds = ((elapsedMs / timedSteps) * remaining) / 1000;

  return Math.max(ETA_ROUNDING_S, Math.round(seconds / ETA_ROUNDING_S) * ETA_ROUNDING_S);
}

function describeDay({ dayNumber, morningLocation, eveningLocation }: RoadTripStop): string {
  return toKebabCase(`day ${dayNumber} ${morningLocation} ${eveningLocation}`).slice(
    0,
    MAX_NAME_LENGTH,
  );
}

/**
 * The screenshots to take: the whole trip first, then one per travel day. File names start with a
 * number so that they stay in trip order when sorted.
 */
export function buildExportTargets(days: RoadTrip): Array<ExportTarget> {
  const targets: Array<ExportTarget> = [
    { routeId: getRouteId(days), label: 'Full trip', fileName: '00-full-trip.png' },
    ...days.map((day, index) => ({
      dayNumber: day.dayNumber,
      routeId: getRouteId([day]),
      label: `Day ${day.dayNumber}: ${day.morningLocation} → ${day.eveningLocation}`,
      fileName: `${String(index + 1).padStart(2, '0')}-${describeDay(day)}.png`,
    })),
  ];

  // Two days with identical names would overwrite each other in the zip
  const seen = new Map<string, number>();

  return targets.map((target) => {
    const count = (seen.get(target.fileName) ?? 0) + 1;
    seen.set(target.fileName, count);

    return count === 1
      ? target
      : { ...target, fileName: target.fileName.replace(/\.png$/, `-${count}.png`) };
  });
}

/**
 * Put the files in a zip. Screenshots are PNGs that are already compressed, so they are stored as
 * they are, which keeps zipping fast.
 */
export function createZip(files: Array<ExportFile>): Uint8Array {
  return zipSync(
    Object.fromEntries(files.map(({ name, data }) => [name, [data, { level: 0 }] as const])),
  );
}

export function readZip(zip: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(zip);
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

  if (!blob) throw new Error('Unable to convert the screenshot to an image');

  return new Uint8Array(await blob.arrayBuffer());
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  // Give the browser time to start the download before the url is released
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
