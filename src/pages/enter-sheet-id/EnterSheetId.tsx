import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { FileText, Trash2 } from 'lucide-react';
import React, { Fragment, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorAlert } from '../../components/error-alert/ErrorAlert';
import { UserFacingError } from '../../utils/errors';
import { env } from '../../config/env';
import { promoteSheetId } from '../../utils/sheetHistory';
import { useSheetStore } from '../../state/sheetState';

export function EnterSheetId() {
  const navigate = useNavigate();
  // Set by the home page when loading the sheet failed
  const error = (useLocation().state as { error?: UserFacingError } | null)?.error;

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: env.googleApiKey,
  });

  const setSheetIds = useSheetStore((state) => state.setSheetIds);
  const setSheetId = useSheetStore((state) => state.setSheetId);
  const sheetIds = useSheetStore((state) => state.sheetIds);

  const [localSheetId, setLocalSheetId] = useState<string>('');

  const getSheetIdIndex = useCallback(
    (id: string) => sheetIds.findIndex((value) => value === id),
    [sheetIds],
  );

  const onSelectSheetId = useCallback(
    (value: string) => {
      setSheetId(value);
      void navigate('/');
    },
    [navigate, setSheetId],
  );

  const onDeleteSheetId = useCallback(
    (value: string) => {
      const localSheetIds = [...sheetIds];
      const index = getSheetIdIndex(value);

      localSheetIds.splice(index, 1);

      setSheetIds(localSheetIds);
    },
    [setSheetIds, sheetIds, getSheetIdIndex],
  );

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);
      const newSheetId = data.get('sheetId') as string;

      if (!newSheetId) {
        throw new Error('No id was provided');
      }

      setSheetIds((sheetIds) => promoteSheetId(sheetIds, newSheetId));

      onSelectSheetId(newSheetId);
    },
    [setSheetIds, onSelectSheetId],
  );

  return (
    <Fragment>
      {isMapLoaded && (
        <GoogleMap
          mapContainerClassName="map-container"
          mapContainerStyle={{
            position: 'absolute',
            inset: 0,
            inlineSize: '100%',
            blockSize: '100%',
          }}
          options={{ disableDefaultUI: true }}
          zoom={3}
          center={{
            lat: 25,
            lng: 0,
          }}
        />
      )}
      <main className="absolute inset-0 flex size-full items-center justify-center">
        <div className="flex min-w-[400px] flex-col items-start rounded-[10px] bg-card p-8 text-card-foreground shadow-lg">
          <h1 className="mb-4 text-2xl font-medium">Enter the Google Sheet id</h1>
          {error && <ErrorAlert className="mb-4" error={error} />}
          <form
            onSubmit={onSubmit}
            className={`flex w-full flex-col gap-2 ${sheetIds.length > 0 ? 'mb-8' : ''}`}
          >
            <Label htmlFor="sheetId">Google Sheet id *</Label>
            <Input
              id="sheetId"
              name="sheetId"
              required
              autoFocus
              value={localSheetId}
              onChange={(event) => setLocalSheetId(event.target.value)}
            />
            <Button type="submit" size="lg" className="mt-2 w-full">
              Continue
            </Button>
          </form>
          {sheetIds.length > 0 && (
            <div className="w-full">
              <h2 className="mb-2 font-bold">Or choose a previous value</h2>
              <ul>
                {sheetIds.map((value) => (
                  <li key={value} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="grow justify-start"
                      onClick={() => onSelectSheetId(value)}
                    >
                      <FileText data-icon="inline-start" />
                      {value}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="delete"
                            onClick={() => onDeleteSheetId(value)}
                          />
                        }
                      >
                        <Trash2 />
                      </TooltipTrigger>
                      <TooltipContent side="top">Remove this id from the history</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </Fragment>
  );
}
