import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DirectionsRenderer, DirectionsService, useGoogleMap } from '@react-google-maps/api';
import { describeDirectionsStatus, UserFacingError } from '../../utils/errors';

type Direction = {
  dayNumber: string;
  morningLocation: string;
  afternoonLocation?: string;
  eveningLocation: string;
};

type DirectionProps = {
  data: Array<Direction>;
  /** Called with the reason when a route cannot be calculated, and without arguments on success */
  onError?: (error?: UserFacingError) => void;
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

function Directions({ data, onError }: DirectionProps) {
  const map = useGoogleMap();
  const directionsRenderer = useRef<google.maps.DirectionsRenderer>(undefined);
  const cachedDirections = useRef(new Map<string, google.maps.DirectionsResult>());
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const { dayNumber: startDayNumber, morningLocation: origin = '' } = useMemo<Partial<Direction>>(
    () => data.at(0) ?? {},
    [data],
  );
  const { dayNumber: endDayNumber, eveningLocation: destination = '' } = useMemo<
    Partial<Direction>
  >(() => data.at(data.length - 1) ?? {}, [data]);

  const id = useMemo(() => `${startDayNumber}.${endDayNumber}`, [startDayNumber, endDayNumber]);

  const stopCount = useMemo(() => Object.entries(data).length, [data]);
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

  const onDirectionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      if (status === 'OK' && response !== null) {
        cachedDirections.current.set(id, response);
        setDirections(response);
        onError?.();
      } else {
        onError?.(describeDirectionsStatus(status, origin, destination));
      }
    },
    [destination, id, onError, origin],
  );

  const onDirectionsRendererCallback = useCallback((renderer: google.maps.DirectionsRenderer) => {
    directionsRenderer.current = renderer;
  }, []);

  useEffect(() => {
    setDirections(cachedDirections.current.get(id) ?? null);
  }, [data, id]);

  useEffect(() => {
    const bounds = directions?.routes[0]?.bounds;

    if (map && bounds) {
      map.fitBounds(bounds, getViewportPadding());
    }
  }, [directions, map]);

  if (directions) {
    return (
      <DirectionsRenderer
        options={{ directions, preserveViewport: true }}
        onLoad={onDirectionsRendererCallback}
      />
    );
  }

  return (
    <DirectionsService
      options={{
        origin,
        destination,
        waypoints,
        travelMode: 'DRIVING' as google.maps.TravelMode,
        unitSystem: google.maps.UnitSystem.METRIC,
      }}
      callback={onDirectionsCallback}
    />
  );
}

export default Directions;
