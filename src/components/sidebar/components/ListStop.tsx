import { Circle, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ListStopProps = {
  location: string;
  /** Where the day starts or ends, shown with a different marker */
  kind: 'start' | 'end';
};

export function ListStop({ location, kind }: ListStopProps) {
  const Icon = kind === 'start' ? Circle : MapPin;

  return (
    <span className="flex w-full min-w-0 items-center gap-2 text-sm">
      <Icon
        className={
          kind === 'start'
            ? 'size-3 shrink-0 text-muted-foreground'
            : 'size-3.5 shrink-0 text-brand'
        }
        aria-hidden
      />
      <Tooltip>
        <TooltipTrigger render={<span className="truncate" />}>{location}</TooltipTrigger>
        <TooltipContent side="bottom">{location}</TooltipContent>
      </Tooltip>
    </span>
  );
}
