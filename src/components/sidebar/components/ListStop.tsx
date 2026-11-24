import { MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ListStop(props: { location: string }) {
  return (
    <span className="flex w-full items-center overflow-hidden text-sm whitespace-nowrap">
      <MapPin className="mr-1 size-3 shrink-0" />
      <Tooltip>
        <TooltipTrigger render={<span className="truncate" />}>{props.location}</TooltipTrigger>
        <TooltipContent side="bottom">{props.location}</TooltipContent>
      </Tooltip>
    </span>
  );
}
