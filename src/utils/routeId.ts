/**
 * The id of the route for the given days: the first and the last day it covers. A single day has
 * the same number twice, for example "3.3".
 */
export function getRouteId(days: Array<{ dayNumber: string }>): string {
  return `${days.at(0)?.dayNumber}.${days.at(-1)?.dayNumber}`;
}

/**
 * Identifies one day by its number and addresses, so what is known about a day is not used for
 * the same day after its addresses were changed
 */
export function getDayKey(day: {
  dayNumber: string;
  morningLocation: string;
  afternoonLocation?: string;
  eveningLocation: string;
}): string {
  return JSON.stringify([
    day.dayNumber,
    day.morningLocation,
    day.afternoonLocation ?? '',
    day.eveningLocation,
  ]);
}
