import { RoadTrip } from '../types/roadTrip.types';

/**
 * Read the kilometers from a sheet value like "210 km"
 */
export function parseDistanceKm(value: string): number {
  return Number.parseFloat(value.replace(/,/g, '')) || 0;
}

/**
 * Read the minutes from a sheet duration like "6:32:58" (h:mm:ss) or "2:30" (h:mm)
 */
export function parseDurationMinutes(value: string): number {
  const match = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(value.trim());

  if (!match) return 0;

  const [, hours, minutes, seconds = '0'] = match;
  return Number(hours) * 60 + Number(minutes) + Number(seconds) / 60;
}

/**
 * Sheet formulas that fail leave an error like "#ERROR!" or "#N/A" in the cell, which says nothing
 * about the real value, unlike an empty cell or "0 km"
 */
export function isSheetError(value: string | undefined): boolean {
  return (value ?? '').trim().startsWith('#');
}

/**
 * Write minutes the way the sheet does ("6:32:58"), so values taken from a calculated route read
 * the same as the ones from the sheet
 */
export function toSheetDuration(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format minutes as "2 h 30 min", "45 min" or "3 d 2 h" for really long trips
 */
export function formatDuration(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const days = Math.floor(rounded / (60 * 24));
  const hours = Math.floor((rounded % (60 * 24)) / 60);
  const minutes = rounded % 60;

  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  return `${minutes} min`;
}

export type TripStats = {
  days: number;
  distanceKm: number;
  driveMinutes: number;
};

/**
 * Totals for the days of the trip that contain driving
 */
export function getTripStats(trip: RoadTrip): TripStats {
  return {
    days: trip.length,
    distanceKm: trip.reduce((total, { distance }) => total + parseDistanceKm(distance), 0),
    driveMinutes: trip.reduce((total, { time }) => total + parseDurationMinutes(time), 0),
  };
}

const dateFormat = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/**
 * Format an ISO date ("2026-07-01") as "Wed, Jul 1". Other formats are shown as they are in the
 * sheet, because there is no reliable way to read them.
 */
export function formatTripDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Dates like 2026-13-45 roll over into the next year, so check that nothing was changed
  const isValid =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day);

  return isValid ? dateFormat.format(date) : value;
}

/**
 * The extra stops of a day, which the sheet separates with a "|"
 */
export function parseViaStops(value: string): Array<string> {
  return value
    .split('|')
    .map((stop) => stop.trim())
    .filter(Boolean);
}
