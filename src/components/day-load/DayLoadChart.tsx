import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { RoadTrip } from '../../types/roadTrip.types';
import { DayLoad, DayLoadLevel, getDayLoads } from '../../utils/dayLoad';
import { formatDuration, formatTripDate } from '../../utils/tripStats';
import { trackEvent } from '../../utils/analytics';

type DayLoadChartProps = {
  data: RoadTrip;
  activeDay?: string;
  /** The day the replay is on, so the chart follows along */
  replayDay?: string;
  onDayClick: (dayNumber: string) => void;
  className?: string;
};

const levels: Record<DayLoadLevel, { label: string; bar: string; dot: string }> = {
  comfortable: { label: 'Up to 4 h', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  long: { label: '4 to 6 h', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  heavy: { label: 'Over 6 h', bar: 'bg-red-500', dot: 'bg-red-500' },
};

const CHART_HEIGHT_PX = 88;
// The scale never shrinks below this, so a trip of short days does not look heavy
const MIN_SCALE_MINUTES = 6 * 60;
// Above this many days the numbers above the bars no longer fit
const MAX_DAYS_WITH_VALUES = 16;

function describeDay(load: DayLoad): string {
  return load.isRestDay
    ? `Day ${load.dayNumber}, ${formatTripDate(load.date)}: rest day`
    : `Day ${load.dayNumber}, ${formatTripDate(load.date)}: ${formatDuration(load.minutes)}, ${Math.round(load.km)} km`;
}

function Bar({
  load,
  scaleMinutes,
  showValue,
  showLabel,
  isActive,
  isReplaying,
  onClick,
}: {
  load: DayLoad;
  scaleMinutes: number;
  showValue: boolean;
  showLabel: boolean;
  isActive: boolean;
  isReplaying: boolean;
  onClick: () => void;
}) {
  const height = load.isRestDay ? 0 : Math.max(4, (load.minutes / scaleMinutes) * CHART_HEIGHT_PX);
  const description = describeDay(load);

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <button
        type="button"
        title={description}
        aria-label={description}
        aria-pressed={isActive}
        disabled={load.isRestDay}
        onClick={onClick}
        className={cn(
          'group flex w-full flex-col items-center justify-end rounded-sm outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
          !load.isRestDay && 'cursor-pointer',
        )}
        style={{ height: CHART_HEIGHT_PX + 16 }}
      >
        {showValue && !load.isRestDay && (
          <span className="mb-0.5 text-[10px] leading-none text-muted-foreground tabular-nums">
            {(load.minutes / 60).toFixed(1).replace(/\.0$/, '')}
          </span>
        )}
        {load.isRestDay ? (
          <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
        ) : (
          <span
            aria-hidden
            className={cn(
              'w-full max-w-7 rounded-t-sm transition-all duration-150',
              levels[load.level].bar,
              'group-hover:brightness-110',
              (isActive || isReplaying) && 'ring-2 ring-foreground ring-offset-1 ring-offset-card',
              !isActive && !isReplaying && 'opacity-85',
            )}
            style={{ height }}
          />
        )}
      </button>
      {/* A fixed height keeps the bars level when a column has no label */}
      <span
        className={cn(
          'h-2.5 text-[10px] leading-[10px] whitespace-nowrap text-muted-foreground tabular-nums',
          (isActive || isReplaying) && 'font-semibold text-foreground',
        )}
      >
        {showLabel || isActive || isReplaying ? load.dayNumber : ''}
      </span>
    </li>
  );
}

/**
 * How much driving every day of the trip holds, to see at a glance which days are too long
 */
export function DayLoadChart({
  data,
  activeDay,
  replayDay,
  onDayClick,
  className,
}: DayLoadChartProps) {
  const [isOpen, setIsOpen] = useState(true);
  const loads = useMemo(() => getDayLoads(data), [data]);

  const scaleMinutes = Math.max(MIN_SCALE_MINUTES, ...loads.map(({ minutes }) => minutes));
  // Two-digit numbers run together when there are many days, so only some of them get a label
  const labelStep = loads.length <= 16 ? 1 : loads.length <= 32 ? 2 : 5;
  const heavyDays = loads.filter(({ level, isRestDay }) => !isRestDay && level === 'heavy').length;

  if (loads.every(({ isRestDay }) => isRestDay)) return null;

  return (
    <section
      aria-label="Drive time per day"
      className={cn('glass flex flex-col gap-2 rounded-2xl p-3', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium">Drive time per day</h2>
          {heavyDays > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {heavyDays} heavy {heavyDays === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
            {(Object.keys(levels) as Array<DayLoadLevel>).map((level) => (
              <li key={level} className="flex items-center gap-1">
                <span className={cn('size-2 rounded-full', levels[level].dot)} aria-hidden />
                {levels[level].label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            aria-label={isOpen ? 'Hide drive time chart' : 'Show drive time chart'}
            aria-expanded={isOpen}
            onClick={() => {
              trackEvent('day_load_toggled', { open: !isOpen });
              setIsOpen(!isOpen);
            }}
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {isOpen ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronUp className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <ol className="flex items-end gap-0.5">
          {loads.map((load, index) => (
            <Bar
              // Day numbers are typed into the sheet, so they are not guaranteed to be unique
              key={`${index}-${load.dayNumber}`}
              load={load}
              scaleMinutes={scaleMinutes}
              showValue={loads.length <= MAX_DAYS_WITH_VALUES}
              showLabel={index % labelStep === 0}
              isActive={activeDay === load.dayNumber}
              isReplaying={replayDay === load.dayNumber}
              onClick={() => onDayClick(load.dayNumber)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
