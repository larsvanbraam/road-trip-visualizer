import { OverlayViewF, PolylineF, useGoogleMap } from '@react-google-maps/api';
import { Plane } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoadTripStop } from '../../types/roadTrip.types';
import { getGreatCircleMidpoint, isFlightDay } from '../../utils/flights';
import { getViewportPadding } from '../direction/viewport';
import { describeFlightLookupStatus, UserFacingError } from '../../utils/errors';
import { locatePlace } from './locatePlace';

type FlightLayerProps = {
  /** All the days of the trip, the flying days are picked from them */
  days: Array<RoadTripStop>;
  /** The selected day. Only its flight is shown, and the map moves to it when it is a flight */
  activeDay?: string;
  /** Room to keep free around the flight when the map moves to it */
  padding?: google.maps.Padding;
  /** Called when the flights cannot be located, for example because the quota is reached */
  onError?: (error: UserFacingError) => void;
};

type Flight = {
  dayNumber: string;
  from: google.maps.LatLngLiteral;
  to: google.maps.LatLngLiteral;
};

// A dashed line, because a flight is not a road. The line itself is invisible, the dashes are icons.
const dashedLine: google.maps.PolylineOptions = {
  geodesic: true,
  strokeOpacity: 0,
  clickable: false,
  icons: [
    {
      icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: '#ef6024', scale: 3 },
      offset: '0',
      repeat: '14px',
    },
  ],
};

function Dot() {
  return <span className="block size-3 rounded-full border-2 border-white bg-brand shadow" />;
}

/**
 * The flying days of the trip: a dashed arc between where the flight starts and ends, with a plane
 * halfway. Flights have no driving route, so they are drawn apart from the Directions result.
 */
export function FlightLayer({ days, activeDay, padding, onError }: FlightLayerProps) {
  const map = useGoogleMap();
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const [located, setLocated] = useState<Array<Flight>>([]);

  const shown = useMemo(
    () => days.filter((day) => isFlightDay(day) && (!activeDay || day.dayNumber === activeDay)),
    [days, activeDay],
  );

  // The lookups take a moment, so what was located can be about days that are no longer shown
  const flights = useMemo(
    () => located.filter(({ dayNumber }) => shown.some((day) => day.dayNumber === dayNumber)),
    [located, shown],
  );

  useEffect(() => {
    let isCurrent = true;

    let failure: string | undefined;

    void Promise.all(
      shown.map(async ({ dayNumber, morningLocation, eveningLocation }) => {
        try {
          const [from, to] = await Promise.all([
            locatePlace(morningLocation),
            locatePlace(eveningLocation),
          ]);

          return from && to ? { dayNumber, from, to } : undefined;
        } catch (status) {
          // The other flights are still shown, only this one could not be placed
          failure ??= typeof status === 'string' ? status : 'UNKNOWN_ERROR';
          return undefined;
        }
      }),
    ).then((results) => {
      if (!isCurrent) return;

      setLocated(results.filter((flight) => flight !== undefined));
      if (failure) onErrorRef.current?.(describeFlightLookupStatus(failure));
    });

    return () => {
      isCurrent = false;
    };
  }, [shown]);

  // Selecting a flying day shows the flight, as there is no route to move the map to
  useEffect(() => {
    const [flight] = flights;

    if (!map || !activeDay || flights.length !== 1 || !flight) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(flight.from);
    bounds.extend(flight.to);
    map.fitBounds(bounds, padding ?? getViewportPadding());
  }, [map, activeDay, flights, padding]);

  return (
    <>
      {flights.map(({ dayNumber, from, to }) => (
        <PolylineF key={dayNumber} path={[from, to]} options={dashedLine} />
      ))}
      {flights.flatMap(({ dayNumber, from, to }) => [
        ...[from, to].map((position, index) => (
          <OverlayViewF
            key={`${dayNumber}-${index === 0 ? 'from' : 'to'}`}
            position={position}
            mapPaneName="overlayMouseTarget"
            getPixelPositionOffset={(width, height) => ({ x: -width / 2, y: -height / 2 })}
          >
            <Dot />
          </OverlayViewF>
        )),
        <OverlayViewF
          key={`${dayNumber}-plane`}
          position={getGreatCircleMidpoint(from, to)}
          mapPaneName="overlayMouseTarget"
          getPixelPositionOffset={(width, height) => ({ x: -width / 2, y: -height / 2 })}
        >
          <span
            role="img"
            aria-label={`Flight on day ${dayNumber}`}
            className="flex items-center gap-1 rounded-full border-2 border-white bg-brand px-2 py-1 text-xs font-semibold text-brand-foreground shadow-lg ring-1 ring-black/10"
          >
            <Plane className="size-3.5" aria-hidden />
            {dayNumber}
          </span>
        </OverlayViewF>,
      ])}
    </>
  );
}
