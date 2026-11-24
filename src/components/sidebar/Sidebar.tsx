import { CarFront, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RoadTrip } from '../../types/roadTrip.types';
import { ListStop } from './components/ListStop';

type SidebarProps = {
  data: RoadTrip;
  activeDay?: string;
  onDayClick: (dayNumber: string) => void;
  onFullOverviewClick: () => void;
};

function Sidebar({ data, activeDay, onDayClick, onFullOverviewClick }: SidebarProps) {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="px-2 py-4">
        <h2 className="text-lg font-medium">Travel days</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          All days that contain traveling, click on a day to see the route in isolation.
        </p>
      </div>
      <Separator />
      <ul className="grow overflow-auto">
        {data.length === 0 &&
          Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="mx-auto mb-2 h-[100px] w-[90%] rounded-lg" />
          ))}
        {data.map((day) => (
          <li key={day.dayNumber} className="odd:bg-muted/50">
            <button
              type="button"
              onClick={() => onDayClick(day.dayNumber)}
              aria-pressed={activeDay === day.dayNumber}
              className={cn(
                'flex w-full flex-col gap-2 px-4 py-2 text-left hover:bg-muted',
                activeDay === day.dayNumber && 'bg-accent',
              )}
            >
              <span className="flex gap-2">
                <CarFront className="text-brand" />
                <span>Day {day.dayNumber}</span>
              </span>
              <span className="flex w-full min-w-0 flex-col gap-2 text-muted-foreground">
                <ListStop location={day.morningLocation} />
                <ListStop location={day.eveningLocation} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Separator />
      <div className="px-2 py-4">
        <Button variant="ghost" className="w-full" onClick={onFullOverviewClick}>
          <List data-icon="inline-start" />
          View full overview
        </Button>
      </div>
    </div>
  );
}

export default Sidebar;
