import { isDrivingDay, needsRouteLookup } from '../../utils/flights';
import { Bed, Circle, Clock, MapPin, Navigation, Route } from 'lucide-react';
import React, { MutableRefObject, useCallback, useImperativeHandle, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { RoadTrip, RoadTripStop } from '../../types/roadTrip.types';
import {
  formatDuration,
  formatTripDate,
  getTripStats,
  isSheetError,
  parseDistanceKm,
  parseDurationMinutes,
  parseViaStops,
} from '../../utils/tripStats';

export type TripOverviewHandles = {
  toggleDrawer(): void;
};

type TripOverviewProps = {
  data: RoadTrip;
  activeDay?: string;
  onDayClick: (dayNumber: string) => void;
  handlesRef: MutableRefObject<TripOverviewHandles | undefined>;
};

const numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

function DayBadge({ day, className }: { day: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums',
        className,
      )}
    >
      {day}
    </span>
  );
}

type DayProps = {
  stop: RoadTripStop;
  isActive: boolean;
  onViewRoute: (dayNumber: string) => void;
};

/**
 * A day without driving: kept small so the days that matter stand out
 */
function RestDay({ stop }: Pick<DayProps, 'stop'>) {
  return (
    <li className="flex items-center gap-3 px-3 py-1.5 text-sm text-muted-foreground">
      <DayBadge day={stop.dayNumber} className="bg-muted text-muted-foreground" />
      <span className="w-24 shrink-0">{formatTripDate(stop.date)}</span>
      <Bed className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        Rest day{stop.morningLocation ? ` in ${stop.morningLocation}` : ''}
      </span>
    </li>
  );
}

function DrivingDay({ stop, isActive, onViewRoute }: DayProps) {
  const via = parseViaStops(stop.afternoonLocation);

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-3 transition',
        isActive && 'border-brand bg-accent',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DayBadge
            day={stop.dayNumber}
            className={cn(isActive && 'bg-brand text-brand-foreground')}
          />
          <span className="font-medium">Day {stop.dayNumber}</span>
          <span className="text-sm text-muted-foreground">{formatTripDate(stop.date)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Route className="size-3" aria-hidden />
            {isSheetError(stop.distance)
              ? '–'
              : numberFormat.format(parseDistanceKm(stop.distance))}{' '}
            km
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {isSheetError(stop.time) ? '–' : formatDuration(parseDurationMinutes(stop.time))}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-start gap-2">
          <Circle className="mt-1 size-3 shrink-0 text-muted-foreground" aria-hidden />
          {stop.morningLocation}
        </span>
        {via.length > 0 && (
          <span className="ml-5 text-xs text-muted-foreground">via {via.join(', ')}</span>
        )}
        <span className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
          {stop.eveningLocation}
        </span>
      </div>

      <Button
        size="sm"
        variant={isActive ? 'secondary' : 'outline'}
        className="self-end"
        aria-label={`View route for day ${stop.dayNumber}`}
        onClick={() => onViewRoute(stop.dayNumber)}
      >
        <Navigation data-icon="inline-start" />
        View route
      </Button>
    </li>
  );
}

function TripOverview({ data, activeDay, onDayClick, handlesRef }: TripOverviewProps) {
  const [drawer, setDrawer] = useState(false);

  useImperativeHandle(handlesRef, () => ({
    toggleDrawer: () => {
      setDrawer(!drawer);
    },
  }));

  const onDayButtonClick = useCallback(
    (dayNumber: string) => {
      onDayClick(dayNumber);
      setDrawer(false);
    },
    [onDayClick, setDrawer],
  );

  const drivingDays = data.filter(isDrivingDay);
  const stats = getTripStats(drivingDays);

  return (
    <Sheet open={drawer} onOpenChange={setDrawer}>
      <SheetContent
        side="left"
        className="gap-0 data-[side=left]:w-[min(92vw,520px)] data-[side=left]:sm:max-w-[min(92vw,520px)]"
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="text-lg">Trip overview</SheetTitle>
          <SheetDescription>
            {data.length} days · {stats.days} driving · {numberFormat.format(stats.distanceKm)} km ·{' '}
            {formatDuration(stats.driveMinutes)} behind the wheel
          </SheetDescription>
        </SheetHeader>

        <ol className="flex flex-col gap-2 overflow-auto p-4">
          {data.map((stop) =>
            isDrivingDay(stop) || needsRouteLookup(stop) ? (
              <DrivingDay
                key={stop.dayNumber}
                stop={stop}
                isActive={activeDay === stop.dayNumber}
                onViewRoute={onDayButtonClick}
              />
            ) : (
              <RestDay key={stop.dayNumber} stop={stop} />
            ),
          )}
        </ol>
      </SheetContent>
    </Sheet>
  );
}

export default TripOverview;
