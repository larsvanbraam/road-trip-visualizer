import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DirectionsRenderer, DirectionsService, useGoogleMap } from '@react-google-maps/api';
import { describeDirectionsStatus, UserFacingError } from '../../utils/errors';
import { getDayKey, getRouteId } from '../../utils/routeId';
import { sumLegs } from './dayProbe';
import { buildWaypoints, Direction, getRouteKey } from './directionsRequest';
import { RouteMarkers } from './RouteMarkers';
import { deriveDayRoute, routeCache } from './routeCache';
import { getViewportPadding } from './viewport';

type DirectionProps = {
  data: Array<Direction>;
  /**
   * All the days of the trip. The route of a single day is taken from the route of the whole trip
   * when that is known, so it does not need a request of its own.
   */
  trip?: Array<Direction>;
  /**
   * Called with the reason when a route cannot be calculated, and without an error when it can.
   * The id is the one of the route it is about, see getRouteId.
   */
  onError?: (error?: UserFacingError, routeId?: string) => void;
  /** Called once the route is drawn and the map is moving to show it */
  onReady?: (routeId: string) => void;
  /** Called with the route that is shown, and with null while there is none */
  onRouteChange?: (directions: google.maps.DirectionsResult | null) => void;
  /**
   * Called with the distance and drive time of every day of the route, as Google calculated them.
   * The key is the one of getDayKey.
   */
  onStats?: (stats: Array<{ key: string; km: number; minutes: number }>) => void;
  /** Room to keep free around the route, defaults to the space around the floating panel */
  padding?: google.maps.Padding;
};

function Directions({
  data,
  trip,
  onError,
  onReady,
  onRouteChange,
  onStats,
  padding,
}: DirectionProps) {
  const map = useGoogleMap();
  // Kept in a ref so that a new callback does not make the map fit the route again
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onRouteChangeRef = useRef(onRouteChange);
  onRouteChangeRef.current = onRouteChange;
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;
  const dataRef = useRef(data);
  dataRef.current = data;
  const directionsRenderer = useRef<google.maps.DirectionsRenderer>(undefined);
  const [results, setResults] = useState<Record<string, google.maps.DirectionsResult>>({});

  const { morningLocation: origin = '' } = data.at(0) ?? {};
  const { eveningLocation: destination = '' } = data.at(-1) ?? {};

  const id = useMemo(() => getRouteId(data), [data]);

  const waypoints = useMemo(() => buildWaypoints(data), [data]);

  // Results are remembered per route and addresses, so changed addresses are looked up again
  const cacheKey = useMemo(() => getRouteKey(data), [data]);
  const latestCacheKey = useRef(cacheKey);
  latestCacheKey.current = cacheKey;

  // A route that was calculated before, also by an earlier version of this component, is reused
  const known = results[cacheKey] ?? routeCache.get(cacheKey);
  const tripKey = useMemo(() => (trip ? getRouteKey(trip) : undefined), [trip]);
  const tripRoute = tripKey ? (results[tripKey] ?? routeCache.get(tripKey)) : undefined;

  const directions = useMemo(() => {
    if (known) return known;
    if (!trip || !tripRoute || data.length !== 1) return null;

    return deriveDayRoute(trip, tripRoute, data[0]) ?? null;
  }, [data, known, trip, tripRoute]);

  const onDirectionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      if (status === 'OK' && response !== null) {
        routeCache.set(cacheKey, response);
        setResults((previous) => ({ ...previous, [cacheKey]: response }));
        // A late answer for a route that is no longer shown only fills the cache
        if (cacheKey === latestCacheKey.current) onError?.(undefined, id);
      } else if (cacheKey === latestCacheKey.current) {
        onError?.(describeDirectionsStatus(status, origin, destination), id);
      }
    },
    [cacheKey, destination, id, onError, origin],
  );

  const onDirectionsRendererCallback = useCallback((renderer: google.maps.DirectionsRenderer) => {
    directionsRenderer.current = renderer;
  }, []);

  useEffect(() => {
    onRouteChangeRef.current?.(directions);
  }, [directions]);

  // The route has a leg for every day, so what the sheet says can be replaced by what Google found
  useEffect(() => {
    const legs = directions?.routes[0]?.legs;
    const days = dataRef.current;

    if (!legs || legs.length < days.length) return;

    // A leg starts where the previous day ended, so it only belongs to the day when that is true
    const stats = days.flatMap((day, index) =>
      index === 0 || days[index - 1].eveningLocation === day.morningLocation
        ? [{ key: getDayKey(day), ...sumLegs([legs[index]]) }]
        : [],
    );

    if (stats.length > 0) onStatsRef.current?.(stats);
  }, [directions]);

  useEffect(() => {
    const bounds = directions?.routes[0]?.bounds;

    if (map && bounds) {
      map.fitBounds(bounds, padding ?? getViewportPadding());
      onReadyRef.current?.(id);
    }
  }, [directions, id, map, padding]);

  // Without stable options the service would look the route up again on every render
  const serviceOptions = useMemo<google.maps.DirectionsRequest>(
    () => ({
      origin,
      destination,
      waypoints,
      travelMode: 'DRIVING' as google.maps.TravelMode,
      unitSystem: google.maps.UnitSystem.METRIC,
    }),
    [origin, destination, waypoints],
  );

  if (directions) {
    return (
      <>
        <DirectionsRenderer
          options={{
            directions,
            preserveViewport: true,
            // We draw our own markers and cards, see RouteMarkers
            suppressMarkers: true,
            suppressInfoWindows: true,
            polylineOptions: { strokeColor: '#ef6024', strokeOpacity: 0.9, strokeWeight: 5 },
          }}
          onLoad={onDirectionsRendererCallback}
        />
        <RouteMarkers days={data} directions={directions} />
      </>
    );
  }

  return <DirectionsService options={serviceOptions} callback={onDirectionsCallback} />;
}

export default Directions;
