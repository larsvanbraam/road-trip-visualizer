import { Navigation } from 'lucide-react';
import React, { MutableRefObject, useCallback, useImperativeHandle, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { parseDistanceKm } from '../../utils/tripStats';
import { RoadTrip, RoadTripStop } from '../../types/roadTrip.types';

export type TripOverviewHandles = {
  toggleDrawer(): void;
};

type TripOverviewProps = {
  data: RoadTrip;
  activeDay?: string;
  onDayClick: (dayNumber: string) => void;
  handlesRef: MutableRefObject<TripOverviewHandles | undefined>;
};

const labels: Record<keyof RoadTripStop, string> = {
  dayNumber: 'Day',
  date: 'Date',
  morningLocation: 'Morning location',
  afternoonLocation: 'Through',
  eveningLocation: 'Evening location',
  distance: 'Drive distance (km)',
  time: 'Drive duration',
};

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

  return (
    <Sheet open={drawer} onOpenChange={setDrawer}>
      <SheetContent
        side="left"
        className="overflow-auto data-[side=left]:w-[min(80vw,1100px)] data-[side=left]:sm:max-w-[min(80vw,1100px)]"
      >
        <SheetHeader>
          <SheetTitle>Trip overview</SheetTitle>
        </SheetHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {Object.keys(data[0] ?? {}).map((key) => (
                <TableHead className="whitespace-nowrap" key={key}>
                  {labels[key as keyof RoadTripStop]}
                </TableHead>
              ))}
              <TableHead>View Route</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.dayNumber}
                className={cn(
                  'odd:bg-muted/50 hover:bg-muted [&:hover>td:first-child]:shadow-[inset_4px_0_0_var(--brand)]',
                  activeDay === row.dayNumber && 'bg-accent',
                )}
              >
                {Object.entries(row).map(([, value], index) => (
                  <TableCell key={`${value}.${index}`} className="text-sm">
                    {value}
                  </TableCell>
                ))}
                <TableCell>
                  {parseDistanceKm(row.distance) > 0 && (
                    <Button
                      className="bg-brand whitespace-nowrap text-brand-foreground hover:bg-brand/80"
                      onClick={() => onDayButtonClick(row.dayNumber)}
                    >
                      <Navigation data-icon="inline-start" />
                      View route
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
}

export default TripOverview;
