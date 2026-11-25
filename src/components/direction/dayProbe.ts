import { buildWaypoints, Direction, getRouteKey } from './directionsRequest';
import { routeCache } from './routeCache';

export type DayProbe = { kind: 'drive'; km: number; minutes: number } | { kind: 'flight' };

export type ProbeOutcome = DayProbe | { kind: 'unknown'; status: string };

/** What was asked before, so a day is only looked up once while the page is open */
const probes = new Map<string, Promise<ProbeOutcome>>();

/** Add up the legs of a route, in kilometers and minutes */
export function sumLegs(legs: Array<google.maps.DirectionsLeg>): { km: number; minutes: number } {
  return {
    km: legs.reduce((total, leg) => total + (leg.distance?.value ?? 0), 0) / 1000,
    minutes: legs.reduce((total, leg) => total + (leg.duration?.value ?? 0), 0) / 60,
  };
}

/**
 * Find out whether a day whose distance the sheet could not calculate is a drive or a flight. It
 * asks for the route of the day, which is also what is drawn when the day is selected, so the
 * answer is kept in the route cache and costs nothing extra later. A place that cannot be driven
 * to, like another continent, means a flight.
 */
export function probeDay(day: Direction): Promise<ProbeOutcome> {
  const key = getRouteKey([day]);
  const known = probes.get(key);

  if (known) return known;

  const probe = new google.maps.DirectionsService()
    .route({
      origin: day.morningLocation,
      destination: day.eveningLocation,
      waypoints: buildWaypoints([day]),
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
    })
    .then((result): ProbeOutcome => {
      const [route] = result.routes;

      if (!route) return { kind: 'flight' };

      routeCache.set(key, result);
      return { kind: 'drive', ...sumLegs(route.legs) };
    })
    .catch((error: unknown): ProbeOutcome => {
      const code = (error as { code?: unknown } | null)?.code;

      if (code === 'ZERO_RESULTS' || code === 'NOT_FOUND') return { kind: 'flight' };
      return { kind: 'unknown', status: typeof code === 'string' ? code : 'UNKNOWN_ERROR' };
    });

  probes.set(key, probe);
  // A failed lookup can be tried again, for example after a quota error
  void probe.then((outcome) => {
    if (outcome.kind === 'unknown') probes.delete(key);
  });

  return probe;
}
