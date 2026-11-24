import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DirectionsRenderer, DirectionsService, useGoogleMap } from '@react-google-maps/api';
import { describeDirectionsStatus, UserFacingError } from '../../utils/errors';
import { getRouteId } from '../../utils/routeId';
import { RouteMarkers } from './RouteMarkers';

type Direction = {
  dayNumber: string;
  morningLocation: string;
  afternoonLocation?: string;
  eveningLocation: string;
};

type DirectionProps = {
  data: Array<Direction>;
  /**
   * Called with the reason when a route cannot be calculated, and without an error when it can.
   * The id is the one of the route it is about, see getRouteId.
   */
  onError?: (error?: UserFacingError, routeId?: string) => void;
  /** Called once the route is drawn and the map is moving to show it */
  onReady?: (routeId: string) => void;
  /** Room to keep free around the route, defaults to the space around the floating panel */
  padding?: google.maps.Padding;
};

/**
 * Room to keep free around the route so it is not hidden behind the floating panel and toolbar
 */
function getViewportPadding(): google.maps.Padding {
  const isDesktop = window.innerWidth >= 768;

  return isDesktop
    ? { top: 80, right: 80, bottom: 80, left: 420 }
    : { top: 80, right: 40, bottom: window.innerHeight * 0.45 + 40, left: 40 };
}

function Directions({ data, onError, onReady, padding }: DirectionProps) {
  const map = useGoogleMap();
  // Kept in a ref so that a new callback does not make the map fit the route again
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const directionsRenderer = useRef<google.maps.DirectionsRenderer>(undefined);
  const [results, setResults] = useState<Record<string, google.maps.DirectionsResult>>({});

  const { morningLocation: origin = '' } = data.at(0) ?? {};
  const { eveningLocation: destination = '' } = data.at(-1) ?? {};

  const id = useMemo(() => getRouteId(data), [data]);

  const stopCount = data.length;
  const waypoints = useMemo(
    () =>
      data.reduce(
        (accumulator, { afternoonLocation, eveningLocation }) =>
          [
            ...accumulator,
            ...(afternoonLocation
              ? afternoonLocation.split('|').map((location) => ({ location, stopover: false }))
              : []),
            stopCount > 1 ? { location: eveningLocation } : undefined,
          ].filter(Boolean) as Array<google.maps.DirectionsWaypoint>,
        [] as Array<google.maps.DirectionsWaypoint>,
      ),
    [stopCount, data],
  );

  // Results are remembered per route and addresses, so changed addresses are looked up again
  const cacheKey = useMemo(
    () => JSON.stringify([id, origin, destination, waypoints]),
    [id, origin, destination, waypoints],
  );
  const latestCacheKey = useRef(cacheKey);
  latestCacheKey.current = cacheKey;

  const directions = results[cacheKey] ?? null;

  const onDirectionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      if (status === 'OK' && response !== null) {
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
