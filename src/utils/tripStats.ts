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
