import { Clock, List, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Logo } from '../logo/Logo';
import { RoadTrip } from '../../types/roadTrip.types';
import {
  formatDuration,
  getTripStats,
  parseDistanceKm,
  parseDurationMinutes,
} from '../../utils/tripStats';
import { ListStop } from './components/ListStop';

type SidebarProps = {
  data: RoadTrip;
  activeDay?: string;
  onDayClick: (dayNumber: string) => void;
  onFullOverviewClick: () => void;
};

const numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/70 px-3 py-2">
      <div className="text-base leading-tight font-semibold whitespace-nowrap tabular-nums">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Sidebar({ data, activeDay, onDayClick, onFullOverviewClick }: SidebarProps) {
  const stats = getTripStats(data);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4 pb-3">
        <Logo />
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Travel days" value={String(stats.days)} />
          <Stat label="Distance" value={`${numberFormat.format(stats.distanceKm)} km`} />
          <Stat label="Driving" value={formatDuration(stats.driveMinutes)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Select a day to see its route on its own, select it again to see the whole trip.
        </p>
      </div>

      <ul className="min-h-0 grow space-y-2 overflow-auto px-3 pb-3">
        {data.length === 0 &&
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
          ))}
        {data.map((day) => {
          const isActive = activeDay === day.dayNumber;

          return (
            <li key={day.dayNumber}>
              <button
                type="button"
                onClick={() => onDayClick(day.dayNumber)}
                aria-pressed={isActive}
                className={cn(
                  'flex w-full flex-col gap-3 rounded-xl border bg-card p-3 text-left transition',
                  'hover:border-brand/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive && 'border-brand bg-accent shadow-sm',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                        isActive
                          ? 'bg-brand text-brand-foreground'
                          : 'bg-primary text-primary-foreground',
                      )}
                      aria-hidden
                    >
                      {day.dayNumber}
                    </span>
                    <span>Day {day.dayNumber}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Route className="size-3" aria-hidden />
                      {numberFormat.format(parseDistanceKm(day.distance))} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {formatDuration(parseDurationMinutes(day.time))}
                    </span>
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <ListStop kind="start" location={day.morningLocation} />
                  <ListStop kind="end" location={day.eveningLocation} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t p-3">
        <Button variant="secondary" className="w-full" onClick={onFullOverviewClick}>
          <List data-icon="inline-start" />
          View full overview
        </Button>
      </div>
    </div>
  );
}

export default Sidebar;
