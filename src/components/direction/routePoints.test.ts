import { describe, expect, it } from 'vite-plus/test';
import { buildRoutePoints, RouteDay, RouteLeg } from './routePoints';

const at = (lat: number, lng: number) => ({ lat: () => lat, lng: () => lng });

const leg = (
  from: [number, number],
  to: [number, number],
  distance = '100 km',
  duration = '1 hour',
): RouteLeg => ({
  start_address: 'from address',
  end_address: 'to address',
  start_location: at(...from),
  end_location: at(...to),
  distance: { text: distance },
  duration: { text: duration },
});

const day = (dayNumber: string, from: string, to: string): RouteDay => ({
  dayNumber,
  morningLocation: from,
  eveningLocation: to,
});

describe('buildRoutePoints', () => {
  it('returns nothing without days or legs', () => {
    expect(buildRoutePoints([], [leg([0, 0], [1, 1])])).toEqual([]);
    expect(buildRoutePoints([day('1', 'A', 'B')], [])).toEqual([]);
  });

  it('creates a start point and an end point per day', () => {
    const points = buildRoutePoints(
      [day('1', 'Amsterdam', 'Cologne'), day('2', 'Cologne', 'Munich')],
      [leg([52, 4], [50, 7]), leg([50, 7], [48, 11])],
    );

    expect(points.map(({ kind, label }) => [kind, label])).toEqual([
      ['start', undefined],
      ['stop', '1'],
      ['end', '2'],
    ]);
    expect(points[0].entries[0]).toMatchObject({ title: 'Day 1 · start', place: 'Amsterdam' });
    expect(points[1].entries[0]).toMatchObject({
      title: 'Day 1 · arrive',
      place: 'Cologne',
      detail: '100 km · 1 hour',
    });
  });

  it('ignores the extra empty leg the service adds at the end', () => {
    const points = buildRoutePoints(
      [day('1', 'A', 'B'), day('2', 'B', 'C')],
      [leg([0, 0], [1, 1]), leg([1, 1], [2, 2]), leg([2, 2], [2, 2], '0 m', '0 min')],
    );

    expect(points).toHaveLength(3);
  });

  it('merges points at the same spot, so round trips do not stack markers', () => {
    const points = buildRoutePoints(
      [day('1', 'Home', 'Far'), day('2', 'Far', 'Home')],
      [leg([52, 4], [48, 11]), leg([48, 11], [52, 4])],
    );

    expect(points).toHaveLength(2);
    expect(points[0].kind).toBe('end');
    expect(points[0].entries.map(({ title }) => title)).toEqual([
      'Day 1 · start',
      'Day 2 · arrive',
    ]);
  });

  it('falls back to the address from Google when a place is blank', () => {
    const [start, end] = buildRoutePoints([day('1', '', '')], [leg([0, 0], [1, 1])]);

    expect(start.entries[0].place).toBe('from address');
    expect(end.entries[0].place).toBe('to address');
  });

  it('works for a single day', () => {
    const points = buildRoutePoints([day('3', 'A', 'B')], [leg([0, 0], [1, 1])]);

    expect(points.map(({ kind }) => kind)).toEqual(['start', 'end']);
  });
});
