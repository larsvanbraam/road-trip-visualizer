import { RoadTrip } from '../types/roadTrip.types';
import { parseDistanceKm, parseDurationMinutes } from './tripStats';

/** How demanding a day of driving is */
export type DayLoadLevel = 'comfortable' | 'long' | 'heavy';

// Hours behind the wheel up to which a day still counts as the given level
const COMFORTABLE_MAX_MINUTES = 4 * 60;
const LONG_MAX_MINUTES = 6 * 60;

export function getLoadLevel(minutes: number): DayLoadLevel {
  if (minutes <= COMFORTABLE_MAX_MINUTES) return 'comfortable';
  if (minutes <= LONG_MAX_MINUTES) return 'long';
  return 'heavy';
}

export type DayLoad = {
  dayNumber: string;
  date: string;
  minutes: number;
  km: number;
  /** A day without driving */
  isRestDay: boolean;
  level: DayLoadLevel;
};

/**
 * The amount of driving of every day of the trip, rest days included so the rhythm of the trip is
 * visible
 */
export function getDayLoads(trip: RoadTrip): Array<DayLoad> {
  return trip.map(({ dayNumber, date, time, distance }) => {
    const km = parseDistanceKm(distance);
    const minutes = parseDurationMinutes(time);

    return { dayNumber, date, minutes, km, isRestDay: km <= 0, level: getLoadLevel(minutes) };
  });
}
