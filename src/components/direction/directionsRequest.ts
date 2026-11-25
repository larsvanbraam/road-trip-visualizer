import { getRouteId } from '../../utils/routeId';

export type Direction = {
  dayNumber: string;
  morningLocation: string;
  afternoonLocation?: string;
  eveningLocation: string;
};

/**
 * The stops between the start and the end of the route. The via points of a day (the afternoon
 * locations) are passed without a stop, the end of every day is a stop of its own.
 */
export function buildWaypoints(days: Array<Direction>): Array<google.maps.DirectionsWaypoint> {
  const stopCount = days.length;

  return days.reduce(
    (accumulator, { afternoonLocation, eveningLocation }) =>
      [
        ...accumulator,
        ...(afternoonLocation
          ? afternoonLocation.split('|').map((location) => ({ location, stopover: false }))
          : []),
        stopCount > 1 ? { location: eveningLocation } : undefined,
      ].filter(Boolean) as Array<google.maps.DirectionsWaypoint>,
    [] as Array<google.maps.DirectionsWaypoint>,
  );
}

/**
 * Identifies the Directions request of the given days. It holds the addresses, so a route is
 * looked up again when its addresses change but not when the same sheet is loaded again.
 */
export function getRouteKey(days: Array<Direction>): string {
  const { morningLocation: origin = '' } = days.at(0) ?? {};
  const { eveningLocation: destination = '' } = days.at(-1) ?? {};

  return JSON.stringify([getRouteId(days), origin, destination, buildWaypoints(days)]);
}
