import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { ArrowRight, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SheetSetupDialog } from '../../components/sheet-setup/SheetSetupDialog';
import { TEMPLATE_COPY_URL } from '../../config/template';
import { Logo } from '../../components/logo/Logo';
import { ErrorAlert } from '../../components/error-alert/ErrorAlert';
import { UserFacingError } from '../../utils/errors';
import { env } from '../../config/env';
import { promoteSheetId } from '../../utils/sheetHistory';
import { useSheetStore } from '../../state/sheetState';

// Hide points of interest and transit stops so the map stays calm
const mapStyles: Array<google.maps.MapTypeStyle> = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

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
  const [isSetupOpen, setIsSetupOpen] = useState(false);

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
    <main className="grid min-h-screen lg:grid-cols-[minmax(440px,540px)_1fr]">
      <section className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-12 sm:py-10">
        <Logo />

        <div className="w-full max-w-md">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
            Turn your trip sheet into a <span className="text-brand">map</span>.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Plan the stops in a Google Sheet and see every day&apos;s route, distance and drive time
            at a glance.
          </p>

          {error && <ErrorAlert className="mt-6" error={error} />}

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2">
            <Label htmlFor="sheetId">Google Sheet id</Label>
            <Input
              id="sheetId"
              name="sheetId"
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="1zYvXpLcZZNy7MunJt6boDW7fPrg..."
              className="h-11 bg-card font-mono text-sm"
              value={localSheetId}
              onChange={(event) => setLocalSheetId(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              It is the long id in the sheet&apos;s url, between <code>/d/</code> and{' '}
              <code>/edit</code>. The sheet needs to be shared with &quot;Anyone with the
              link&quot;.
            </p>
            <Button type="submit" size="lg" className="mt-2 h-11 w-full text-base">
              Show my trip
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-brand/30 bg-accent/60 p-4 sm:flex-row sm:items-center">
            <FileSpreadsheet className="size-8 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 grow">
              <p className="font-medium">No sheet yet?</p>
              <p className="text-sm text-muted-foreground">
                Start from our template, it works out distances and drive times for you.
              </p>
            </div>
            <div className="flex shrink-0 gap-2 sm:flex-col">
              <a
                href={TEMPLATE_COPY_URL}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: 'sm' })}
              >
                Get the template
              </a>
              <Button variant="ghost" size="sm" onClick={() => setIsSetupOpen(true)}>
                How it works
              </Button>
            </div>
          </div>

          {sheetIds.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Recent sheets</h2>
              <ul className="flex flex-col gap-1.5">
                {sheetIds.map((value) => (
                  <li
                    key={value}
                    className="group flex items-center gap-1 rounded-xl border bg-card pr-1 transition hover:border-brand/40"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 grow items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={() => onSelectSheetId(value)}
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate font-mono">{value}</span>
                    </button>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
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

        <p className="text-xs text-muted-foreground">
          Your data stays in your Google Sheet. Nothing is stored on a server.
        </p>
      </section>

      <section className="map-grid relative hidden lg:block" aria-hidden>
        {isMapLoaded && (
          <GoogleMap
            mapContainerClassName="map-container"
            mapContainerStyle={{ width: '100%', height: '100%' }}
            options={{
              disableDefaultUI: true,
              gestureHandling: 'none',
              keyboardShortcuts: false,
              styles: mapStyles,
            }}
            zoom={4}
            center={{ lat: 48, lng: 10 }}
          />
        )}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      </section>
      <SheetSetupDialog open={isSetupOpen} onOpenChange={setIsSetupOpen} />
    </main>
  );
}
