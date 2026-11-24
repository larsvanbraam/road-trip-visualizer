/**
 * The id of the route for the given days: the first and the last day it covers. A single day has
 * the same number twice, for example "3.3".
 */
export function getRouteId(days: Array<{ dayNumber: string }>): string {
  return `${days.at(0)?.dayNumber}.${days.at(-1)?.dayNumber}`;
}
