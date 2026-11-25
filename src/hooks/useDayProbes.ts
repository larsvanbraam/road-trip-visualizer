import { useEffect, useMemo, useRef, useState } from 'react';
import { DayProbe, probeDay } from '../components/direction/dayProbe';
import { RoadTrip } from '../types/roadTrip.types';
import { describeDirectionsStatus, UserFacingError } from '../utils/errors';
import { needsRouteLookup } from '../utils/flights';
import { getDayKey } from '../utils/routeId';

/**
 * For the days the sheet could not calculate, find out whether they are drives or flights and how
 * long the drive is. The answers are by day key, see getDayKey. The days are looked up one after
 * the other, because a quota that runs out would fail all of them at once.
 */
export function useDayProbes(
  days: RoadTrip,
  /** Only look the days up when asked for, as it takes a request for every day */
  isEnabled: boolean,
  onError: (error: UserFacingError) => void,
  /** Changing it looks the days up again, for example after a quota error */
  retryKey: number,
): Record<string, DayProbe> {
  const [probes, setProbes] = useState<Record<string, DayProbe>>({});
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const candidates = useMemo(() => days.filter(needsRouteLookup), [days]);

  useEffect(() => {
    if (!isEnabled) return;

    let isCurrent = true;

    void (async () => {
      for (const day of candidates) {
        const outcome = await probeDay(day);

        if (!isCurrent) return;

        if (outcome.kind === 'unknown') {
          onErrorRef.current(
            describeDirectionsStatus(outcome.status, day.morningLocation, day.eveningLocation),
          );
          return;
        }

        setProbes((previous) => ({ ...previous, [getDayKey(day)]: outcome }));
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [candidates, isEnabled, retryKey]);

  return probes;
}
