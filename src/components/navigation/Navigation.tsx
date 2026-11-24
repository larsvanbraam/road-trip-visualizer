import { ExternalLink, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RouterLink } from '../../config/router';
import { useSheetStore } from '../../state/sheetState';

type NavigationProps = {
  onMapSizeChange: (size: MapSize) => void;
  onUpdateData: () => void;
  isDataLoading: boolean;
};

export enum MapSize {
  Cover = 'cover',
  Fixed = 'fixed',
}

const mapSizeItems = [
  { value: MapSize.Fixed, label: 'Fixed size' },
  { value: MapSize.Cover, label: 'Cover' },
];

const headerButtonClass = 'text-primary-foreground hover:bg-white/10 hover:text-primary-foreground';

function Navigation({ onMapSizeChange, onUpdateData, isDataLoading }: NavigationProps) {
  const [mapSize, setMapSize] = useState(MapSize.Cover);
  const sheetId = useSheetStore((state) => state.sheetId);

  const onSizeChange = useCallback(
    (value: MapSize | null) => {
      if (!value) return;
      setMapSize(value);
      onMapSizeChange(value);
    },
    [onMapSizeChange],
  );

  return (
    <header className="flex h-16 items-center gap-2 bg-primary px-6 text-primary-foreground">
      <h1 className="grow text-2xl font-bold">Road Trip Visualizer</h1>
      <Button
        variant="ghost"
        className={headerButtonClass}
        nativeButton={false}
        render={
          <a
            href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
            target="_blank"
            rel="noreferrer"
          />
        }
      >
        <ExternalLink data-icon="inline-start" />
        View source
      </Button>
      <Button
        variant="ghost"
        className={headerButtonClass}
        nativeButton={false}
        render={<Link to={RouterLink.EnterSheetId} />}
      >
        <ArrowLeftRight data-icon="inline-start" />
        Change source
      </Button>
      <Button
        variant="ghost"
        className={headerButtonClass}
        onClick={onUpdateData}
        disabled={isDataLoading}
      >
        <RefreshCw data-icon="inline-start" />
        Update data
      </Button>
      <Select items={mapSizeItems} value={mapSize} onValueChange={onSizeChange}>
        <SelectTrigger aria-label="Map size" className="w-48 border-white/30 bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {mapSizeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
}

export default Navigation;
