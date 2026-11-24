import {
  ArrowLeftRight,
  CircleHelp,
  ExternalLink,
  Maximize2,
  RefreshCw,
  Square,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RouterLink } from '../../config/router';
import { SheetSetupDialog } from '../sheet-setup/SheetSetupDialog';
import { useSheetStore } from '../../state/sheetState';

type NavigationProps = {
  onMapSizeChange: (size: MapSize) => void;
  onUpdateData: () => void;
  isDataLoading: boolean;
  className?: string;
};

export enum MapSize {
  Cover = 'cover',
  Fixed = 'fixed',
}

const mapSizes = [
  { value: MapSize.Cover, label: 'Fill the screen', icon: Maximize2 },
  { value: MapSize.Fixed, label: 'Fixed 1280 × 720 (for screenshots)', icon: Square },
];

const iconButton = buttonVariants({ variant: 'ghost', size: 'icon' });

/**
 * Floating toolbar with the actions for the current trip
 */
function Navigation({ onMapSizeChange, onUpdateData, isDataLoading, className }: NavigationProps) {
  const [mapSize, setMapSize] = useState(MapSize.Cover);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const sheetId = useSheetStore((state) => state.sheetId);

  const onSizeChange = useCallback(
    (size: MapSize) => {
      setMapSize(size);
      onMapSizeChange(size);
    },
    [onMapSizeChange],
  );

  return (
    <>
      <nav
        aria-label="Trip actions"
        className={cn('glass flex items-center gap-1 rounded-full p-1', className)}
      >
        <Tooltip>
          <TooltipTrigger
            aria-label="How to set up your sheet"
            className={iconButton}
            onClick={() => setIsSetupOpen(true)}
          >
            <CircleHelp />
          </TooltipTrigger>
          <TooltipContent side="bottom">Set up your sheet</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="View source sheet"
            className={iconButton}
            render={
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <ExternalLink />
          </TooltipTrigger>
          <TooltipContent side="bottom">View the Google Sheet</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Change source sheet"
            className={iconButton}
            render={<Link to={RouterLink.EnterSheetId} />}
          >
            <ArrowLeftRight />
          </TooltipTrigger>
          <TooltipContent side="bottom">Use a different sheet</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Update data"
            disabled={isDataLoading}
            className={iconButton}
            onClick={onUpdateData}
          >
            <RefreshCw className={cn(isDataLoading && 'animate-spin')} />
          </TooltipTrigger>
          <TooltipContent side="bottom">Reload the sheet</TooltipContent>
        </Tooltip>

        <div role="group" aria-label="Map size" className="ml-1 flex rounded-full bg-muted p-0.5">
          {mapSizes.map(({ value, label, icon: Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger
                aria-label={label}
                aria-pressed={mapSize === value}
                onClick={() => onSizeChange(value)}
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      'rounded-full',
                      mapSize === value && 'bg-card text-foreground shadow-sm hover:bg-card',
                    )}
                  />
                }
              >
                <Icon />
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </nav>
      <SheetSetupDialog open={isSetupOpen} onOpenChange={setIsSetupOpen} />
    </>
  );
}

export default Navigation;
