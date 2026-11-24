import { OverlayViewF, useGoogleMap } from '@react-google-maps/api';
import { Flag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { buildRoutePoints, RouteDay, RoutePoint } from './routePoints';

type RouteMarkersProps = {
  days: Array<RouteDay>;
  directions: google.maps.DirectionsResult;
};

// Keep clicks and drags on our own elements from moving the map underneath them
function stopMapEvents(element: HTMLElement | null) {
  if (element) google.maps.OverlayView.preventMapHitsAndGesturesFrom(element);
}

function Marker({
  point,
  isOpen,
  onToggle,
}: {
  point: RoutePoint;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { kind, label } = point;
  const name = point.entries.map(({ place }) => place).at(0) ?? 'Stop';

  return (
    <button
      type="button"
      ref={stopMapEvents}
      onClick={onToggle}
      aria-label={name}
      aria-expanded={isOpen}
      className={cn(
        'flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-lg ring-1 ring-black/10 transition-transform duration-150 outline-none',
        'hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
        kind === 'start' && 'bg-card text-primary',
        kind === 'stop' && 'bg-primary text-primary-foreground',
        kind === 'end' && 'bg-brand text-brand-foreground',
        isOpen && 'scale-125 bg-brand text-brand-foreground',
      )}
    >
      {kind === 'start' ? (
        <span className="size-2.5 rounded-full bg-primary" aria-hidden />
      ) : kind === 'end' && !label ? (
        <Flag className="size-3.5" aria-hidden />
      ) : (
        label
      )}
    </button>
  );
}

function Popup({ point, onClose }: { point: RoutePoint; onClose: () => void }) {
  const [primary, ...others] = point.entries;

  return (
    <div
      ref={stopMapEvents}
      role="dialog"
      aria-label={primary.place}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className="glass absolute bottom-full left-1/2 z-20 mb-3 w-64 -translate-x-1/2 rounded-xl p-3 text-left text-sm text-card-foreground"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>

      <p className="pr-6 leading-snug font-medium">{primary.place}</p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {[primary, ...others].map((entry) => (
          <li key={entry.title} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{entry.title}</span>
            {entry.detail && <span> · {entry.detail}</span>}
          </li>
        ))}
      </ul>

      {/* Arrow pointing at the marker */}
      <span
        aria-hidden
        className="absolute top-full left-1/2 size-3 -translate-x-1/2 -translate-y-1.5 rotate-45 border-r border-b bg-card"
      />
    </div>
  );
}

/**
 * Markers for the start and the end of each day, in the style of the app instead of the default
 * red Google pins. Clicking one opens a small card with the place and the leg that ends there.
 */
export function RouteMarkers({ days, directions }: RouteMarkersProps) {
  const map = useGoogleMap();
  const [openKey, setOpenKey] = useState<string>();

  const points = useMemo(
    () => buildRoutePoints(days, directions.routes[0]?.legs ?? []),
    [days, directions],
  );

  // A new route means new markers, so any open card no longer applies
  useEffect(() => setOpenKey(undefined), [directions]);

  // Clicking the map closes the card
  useEffect(() => {
    const listener = map?.addListener('click', () => setOpenKey(undefined));
    return () => listener?.remove();
  }, [map]);

  return (
    <>
      {points.map((point) => {
        const isOpen = openKey === point.key;

        return (
          <OverlayViewF
            key={point.key}
            position={point.position}
            mapPaneName="overlayMouseTarget"
            getPixelPositionOffset={(width, height) => ({ x: -width / 2, y: -height / 2 })}
            zIndex={isOpen ? 10 : 1}
          >
            <div className="relative">
              <Marker
                point={point}
                isOpen={isOpen}
                onToggle={() => setOpenKey(isOpen ? undefined : point.key)}
              />
              {isOpen && <Popup point={point} onClose={() => setOpenKey(undefined)} />}
            </div>
          </OverlayViewF>
        );
      })}
    </>
  );
}
