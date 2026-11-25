import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { Direction, getRouteKey } from './directionsRequest';
import { deriveDayRoute, routeCache } from './routeCache';

class FakeBounds {
  points: Array<{ lat: number; lng: number }> = [];
  extend(point: { lat: number; lng: number }) {
    this.points.push(point);
  }
}

beforeEach(() => {
  (globalThis as unknown as { google: unknown }).google = { maps: { LatLngBounds: FakeBounds } };
  routeCache.clear();
});

const day = (dayNumber: string, from: string, to: string, via?: string): Direction => ({
  dayNumber,
  morningLocation: from,
  eveningLocation: to,
  afternoonLocation: via,
});

const leg = (id: string) => ({
  id,
  steps: [{ path: [{ lat: 1, lng: 1 }] }, { path: [{ lat: 2, lng: 2 }] }],
});

/** A trip route with a leg per day and the empty leg the service adds at the end */
const tripRoute = (legCount: number) =>
  ({
    request: { travelMode: 'DRIVING' },
    routes: [
      {
        legs: Array.from({ length: legCount }, (_, index) => leg(`leg-${index}`)),
        overview_path: [],
        waypoint_order: [0, 1],
      },
    ],
  }) as unknown as google.maps.DirectionsResult;

const trip = [day('1', 'A', 'B'), day('2', 'B', 'C'), day('3', 'C', 'D')];

describe('deriveDayRoute', () => {
  it('takes the leg of the day from the route of the whole trip', () => {
    const derived = deriveDayRoute(trip, tripRoute(4), trip[1]);
    const [route] = derived!.routes;

    expect(route.legs).toHaveLength(1);
    expect((route.legs[0] as unknown as { id: string }).id).toBe('leg-1');
    expect(route.overview_path).toHaveLength(2);
    expect((route.bounds as unknown as FakeBounds).points).toHaveLength(2);
    expect(derived!.request).toEqual({ travelMode: 'DRIVING' });
  });

  it('works for the first and the last day', () => {
    const first = deriveDayRoute(trip, tripRoute(4), trip[0]);
    const last = deriveDayRoute(trip, tripRoute(4), trip[2]);

    expect((first!.routes[0].legs[0] as unknown as { id: string }).id).toBe('leg-0');
    expect((last!.routes[0].legs[0] as unknown as { id: string }).id).toBe('leg-2');
  });

  it('does not change the route of the whole trip', () => {
    const route = tripRoute(4);
    deriveDayRoute(trip, route, trip[1]);

    expect(route.routes[0].legs).toHaveLength(4);
  });

  it('asks again when the day does not start where the previous day ended', () => {
    const gap = [day('1', 'A', 'B'), day('2', 'X', 'C')];

    expect(deriveDayRoute(gap, tripRoute(3), gap[1])).toBeUndefined();
  });

  it('asks again when the addresses of the day are not the ones of the trip', () => {
    expect(deriveDayRoute(trip, tripRoute(4), day('2', 'B', 'Elsewhere'))).toBeUndefined();
    expect(deriveDayRoute(trip, tripRoute(4), day('2', 'B', 'C', 'Via'))).toBeUndefined();
  });

  it('asks again when the day is not part of the trip', () => {
    expect(deriveDayRoute(trip, tripRoute(4), day('9', 'B', 'C'))).toBeUndefined();
  });

  it('asks again when the route has fewer legs than the trip has days', () => {
    expect(deriveDayRoute(trip, tripRoute(2), trip[1])).toBeUndefined();
  });

  it('asks again for a trip of one day, that route is the day itself', () => {
    expect(deriveDayRoute([trip[0]], tripRoute(1), trip[0])).toBeUndefined();
  });
});

describe('routeCache', () => {
  it('remembers a route per request', () => {
    const route = tripRoute(1);
    const key = getRouteKey(trip);

    expect(routeCache.get(key)).toBeUndefined();
    routeCache.set(key, route);
    expect(routeCache.get(key)).toBe(route);
  });

  it('uses another key when an address changes', () => {
    expect(getRouteKey(trip)).not.toBe(getRouteKey([trip[0], trip[1], day('3', 'C', 'E')]));
    expect(getRouteKey(trip)).toBe(getRouteKey(trip.map((item) => ({ ...item }))));
  });
});
