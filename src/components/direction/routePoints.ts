export type RouteDay = {
  dayNumber: string;
  morningLocation: string;
  eveningLocation: string;
};

/** The parts of a Google Directions leg that are needed to place markers */
export type RouteLeg = {
  start_address: string;
  end_address: string;
  start_location: { lat(): number; lng(): number };
  end_location: { lat(): number; lng(): number };
  distance?: { text: string };
  duration?: { text: string };
};

export type RouteEntry = {
  /** For example "Day 3 · arrive" */
  title: string;
  place: string;
  /** Distance and drive time of the leg that ends here */
  detail?: string;
};

export type RoutePoint = {
  key: string;
  position: google.maps.LatLngLiteral;
  /** What the marker shows: the day number, or nothing for the start */
  label?: string;
  kind: 'start' | 'stop' | 'end';
  entries: Array<RouteEntry>;
};

/**
 * Turn the legs of a calculated route into the points that get a marker. The first point is where
 * the trip starts, every other point is where a day ends. Points at the same spot (for example when
 * the trip returns to where it started) are merged so that markers do not stack.
 */
export function buildRoutePoints(days: Array<RouteDay>, legs: Array<RouteLeg>): Array<RoutePoint> {
  if (days.length === 0 || legs.length === 0) return [];

  const points: Array<RoutePoint> = [];

  const add = (
    position: google.maps.LatLngLiteral,
    entry: RouteEntry,
    label: string | undefined,
    kind: RoutePoint['kind'],
  ) => {
    const key = `${position.lat.toFixed(4)},${position.lng.toFixed(4)}`;
    const existing = points.find((point) => point.key === key);

    if (existing) {
      existing.entries.push(entry);
      // A place that is both the start and the end of the trip counts as the end
      if (kind === 'end') existing.kind = 'end';
      return;
    }

    points.push({ key, position, label, kind, entries: [entry] });
  };

  const [firstLeg] = legs;
  add(
    { lat: firstLeg.start_location.lat(), lng: firstLeg.start_location.lng() },
    {
      title: `Day ${days[0].dayNumber} · start`,
      place: days[0].morningLocation || firstLeg.start_address,
    },
    undefined,
    'start',
  );

  // The service can return an extra, empty leg at the end, so only look at one leg per day
  legs.slice(0, days.length).forEach((leg, index) => {
    const day = days[index];
    const details = [leg.distance?.text, leg.duration?.text].filter(Boolean).join(' · ');

    add(
      { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
      {
        title: `Day ${day.dayNumber} · arrive`,
        place: day.eveningLocation || leg.end_address,
        detail: details || undefined,
      },
      day.dayNumber,
      index === days.length - 1 ? 'end' : 'stop',
    );
  });

  return points;
}
