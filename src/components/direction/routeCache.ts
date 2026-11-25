import type { Direction } from './directionsRequest';

/**
 * Calculated routes for as long as the page is open. It deliberately lives in memory only: the
 * Google Maps Platform terms do not allow storing Directions results beyond that.
 */
const cache = new Map<string, google.maps.DirectionsResult>();

export const routeCache = {
  get: (key: string) => cache.get(key),
  set: (key: string, result: google.maps.DirectionsResult) => void cache.set(key, result),
  clear: () => cache.clear(),
};

/**
 * The route of one day, taken from the route of the whole trip instead of asking Google again.
 * The trip route has a leg for the end of every day, in order, so the leg of the day is already
 * there. Returns nothing when that is not safe to assume, for example when the day does not start
 * where the previous day ended, and the day has to be looked up on its own.
 */
export function deriveDayRoute(
  trip: Array<Direction>,
  tripRoute: google.maps.DirectionsResult,
  day: Direction,
): google.maps.DirectionsResult | undefined {
  const index = trip.findIndex(({ dayNumber }) => dayNumber === day.dayNumber);
  const [route] = tripRoute.routes;
  const tripDay = trip[index];

  if (!route || !tripDay || trip.length < 2) return undefined;

  // The service can add an empty leg at the end, but it can never have fewer legs than days
  if (route.legs.length < trip.length) return undefined;

  const isSameDay =
    tripDay.morningLocation === day.morningLocation &&
    tripDay.eveningLocation === day.eveningLocation &&
    tripDay.afternoonLocation === day.afternoonLocation;
  const startsWhereThePreviousDayEnded =
    index === 0 || trip[index - 1].eveningLocation === day.morningLocation;

  if (!isSameDay || !startsWhereThePreviousDayEnded) return undefined;

  const leg = route.legs[index];
  const path = leg.steps.flatMap((step) => step.path ?? []);
  if (path.length === 0) return undefined;

  const bounds = new google.maps.LatLngBounds();
  path.forEach((point) => bounds.extend(point));

  return {
    ...tripRoute,
    routes: [{ ...route, legs: [leg], overview_path: path, bounds, waypoint_order: [] }],
  };
}
