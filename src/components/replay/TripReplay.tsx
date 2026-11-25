import { Car, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RoadTrip } from '../../types/roadTrip.types';
import { getViewportPadding } from '../direction/viewport';
import { buildTimeline, LatLng, sampleTimeline } from '../../utils/replayTimeline';
import {
  formatDuration,
  formatTripDate,
  parseDistanceKm,
  parseDurationMinutes,
} from '../../utils/tripStats';
import { trackEvent } from '../../utils/analytics';

type TripReplayProps = {
  /** The days that are shown on the map, in order */
  days: RoadTrip;
  directions: google.maps.DirectionsResult | null;
  getMap: () => google.maps.Map | undefined;
  /** Called with the day the car is on, and without one when the replay is closed */
  onDayChange: (dayNumber?: string) => void;
  onClose: () => void;
};

const SPEEDS = [1, 2, 4] as const;
const FOLLOW_ZOOM = 8;
const TRAVELED_COLOR = '#7c2d12';

const numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

/** The path of the leg of every day, as plain coordinates */
function getLegPaths(directions: google.maps.DirectionsResult | null, dayCount: number) {
  const legs = directions?.routes[0]?.legs ?? [];

  // Another route is on its way, this one does not belong to the days that are shown
  if (legs.length < dayCount) return [];

  return legs.slice(0, dayCount).map((leg): Array<LatLng> => {
    const path = leg.steps.flatMap((step) => step.path ?? []);
    const points = path.length > 0 ? path : [leg.start_location, leg.end_location];

    return points.map((point) => ({ lat: point.lat(), lng: point.lng() }));
  });
}

/**
 * Drives a car along the route that is shown, day by day, with the map following it
 */
export function TripReplay({ days, directions, getMap, onDayChange, onClose }: TripReplayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  const timeline = useMemo(() => {
    const paths = getLegPaths(directions, days.length);

    return buildTimeline(
      days.map((day, index) => ({
        dayNumber: day.dayNumber,
        date: day.date,
        from: day.morningLocation,
        to: day.eveningLocation,
        km: parseDistanceKm(day.distance),
        minutes: parseDurationMinutes(day.time),
        path: paths[index] ?? [],
      })),
    );
  }, [days, directions]);

  const sample = useMemo(() => sampleTimeline(timeline, elapsed), [timeline, elapsed]);
  const segment = sample ? timeline.segments[sample.dayIndex] : undefined;

  // Another route means another replay, start over
  useEffect(() => {
    setElapsed(0);
    setIsPlaying(false);
  }, [timeline]);

  // The clock
  useEffect(() => {
    if (!isPlaying) return;

    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const delta = now - last;
      last = now;

      setElapsed((previous) => Math.min(previous + delta * speed, timeline.totalMs));
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [isPlaying, speed, timeline.totalMs]);

  // Stop at the end instead of ticking on
  useEffect(() => {
    if (isPlaying && timeline.totalMs > 0 && elapsed >= timeline.totalMs) setIsPlaying(false);
  }, [elapsed, isPlaying, timeline.totalMs]);

  // The car and the part of the route it has driven are drawn on the map directly, because they
  // change every frame and should not go through React
  const car = useRef<google.maps.Marker>(undefined);
  const completed = useRef<google.maps.Polyline>(undefined);
  const current = useRef<google.maps.Polyline>(undefined);
  const completedUpTo = useRef(-1);

  useEffect(() => {
    const map = getMap();

    if (!map) return;

    const line = () =>
      new google.maps.Polyline({
        map,
        strokeColor: TRAVELED_COLOR,
        strokeOpacity: 1,
        strokeWeight: 5,
        zIndex: 5,
      });

    completed.current = line();
    current.current = line();
    car.current = new google.maps.Marker({
      map,
      zIndex: 10,
      clickable: false,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: TRAVELED_COLOR,
        strokeWeight: 5,
      },
    });
    completedUpTo.current = -1;

    return () => {
      completed.current?.setMap(null);
      current.current?.setMap(null);
      car.current?.setMap(null);
    };
  }, [getMap]);

  const hasMoved = elapsed > 0;

  useEffect(() => {
    if (!sample) return;

    car.current?.setPosition(sample.position);
    current.current?.setPath(sample.partialPath);

    // Finished days only change when the car moves on to the next, not on every frame
    if (completedUpTo.current !== sample.dayIndex) {
      completed.current?.setPath(
        timeline.segments.slice(0, sample.dayIndex).flatMap(({ path }) => path),
      );
      completedUpTo.current = sample.dayIndex;
    }

    if (hasMoved) getMap()?.moveCamera({ center: sample.position });
  }, [getMap, hasMoved, sample, timeline.segments]);

  const dayNumber = sample?.dayNumber;
  useEffect(() => onDayChange(dayNumber), [dayNumber, onDayChange]);
  useEffect(() => () => onDayChange(undefined), [onDayChange]);

  // Dragging the map means the user wants to look around, so the camera stops following
  useEffect(() => {
    const listener = getMap()?.addListener('dragstart', () => setIsPlaying(false));
    return () => listener?.remove();
  }, [getMap]);

  // Leaving the replay shows the whole route again
  const bounds = directions?.routes[0]?.bounds;
  useEffect(
    () => () => {
      if (bounds) getMap()?.fitBounds(bounds, getViewportPadding());
    },
    [bounds, getMap],
  );

  const play = useCallback(() => {
    const map = getMap();

    if (elapsed >= timeline.totalMs) setElapsed(0);
    if (elapsed === 0 || elapsed >= timeline.totalMs) {
      trackEvent('replay_started', { days: days.length });
      map?.moveCamera({ zoom: FOLLOW_ZOOM });
    }

    setIsPlaying(true);
  }, [days.length, elapsed, getMap, timeline.totalMs]);

  const isFinished = timeline.totalMs > 0 && elapsed >= timeline.totalMs;
  const hasRoute = timeline.segments.length > 0;

  return (
    <div
      role="region"
      aria-label="Trip replay"
      className="glass absolute inset-x-3 top-3 z-10 md:top-8 flex flex-col gap-3 rounded-2xl p-3 md:right-auto md:left-[404px] md:w-[min(480px,calc(100vw-404px-240px))] md:min-w-[360px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Car className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" aria-live="polite">
              {segment
                ? `Day ${segment.dayNumber} · ${formatTripDate(segment.date)}`
                : hasRoute
                  ? 'Trip replay'
                  : 'Waiting for the route…'}
            </p>
            {segment && (
              <p className="truncate text-xs text-muted-foreground">
                {segment.from} → {segment.to}
                {sample?.hasArrived && !isFinished ? ' · arrived' : ''}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label="Close replay"
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="icon"
          className="shrink-0 rounded-full"
          aria-label={isPlaying ? 'Pause replay' : isFinished ? 'Replay again' : 'Play replay'}
          disabled={!hasRoute}
          onClick={isPlaying ? () => setIsPlaying(false) : play}
        >
          {isPlaying ? <Pause /> : isFinished ? <RotateCcw /> : <Play />}
        </Button>

        <input
          type="range"
          aria-label="Replay position"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--brand)]"
          min={0}
          max={Math.max(timeline.totalMs, 1)}
          step={1}
          value={elapsed}
          disabled={!hasRoute}
          onChange={(event) => setElapsed(Number(event.target.value))}
        />

        <button
          type="button"
          aria-label={`Speed ${speed} times, change speed`}
          onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
          className="w-9 shrink-0 rounded-md border bg-card py-1 text-xs font-medium tabular-nums transition hover:bg-muted"
        >
          {speed}×
        </button>
      </div>

      {sample && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {numberFormat.format(sample.drivenKm)} km · {formatDuration(sample.drivenMinutes)} driven
        </p>
      )}
    </div>
  );
}
