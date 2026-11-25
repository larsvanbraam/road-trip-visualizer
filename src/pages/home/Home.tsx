import { Car, Loader2, X } from 'lucide-react';
import { ErrorAlert } from '../../components/error-alert/ErrorAlert';
import { describeMissingTab, describeSheetError, UserFacingError } from '../../utils/errors';
import { Button } from '@/components/ui/button';
import { env } from '../../config/env';
import Navigation, { MapSize } from '../../components/navigation/Navigation';
import Sidebar from '../../components/sidebar/Sidebar';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import Directions from '../../components/direction/Directions';
import { FlightLayer } from '../../components/flight/FlightLayer';
import { ExportAllButton } from '../../components/export/ExportAllButton';
import { ExportOverlay } from '../../components/export/ExportOverlay';
import { RouteResult, useDayExport } from '../../hooks/useDayExport';
import ScreenshotButton from '../../components/screenshot-button/ScreenshotButton';
import { DayLoadChart } from '../../components/day-load/DayLoadChart';
import { TripReplay } from '../../components/replay/TripReplay';
import TripOverview, { TripOverviewHandles } from '../../components/trip-overview/TripOverview';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useGoogleSheets from 'use-google-sheets';
import { parseGoogleSheetData } from '../../utils/parseGoogleSheetData';
import { Navigate } from 'react-router-dom';
import { parseDistanceKm } from '../../utils/tripStats';
import { isFlightDay } from '../../utils/flights';
import { useSheetStore } from '../../state/sheetState';
import { useSheetTitle } from '../../hooks/useSheetTitle';
import { trackEvent } from '../../utils/analytics';

// Hide points of interest and transit stops so the route stands out
const mapStyles: Array<google.maps.MapTypeStyle> = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// Screenshots are framed evenly, there is no floating panel in them
const EXPORT_PADDING: google.maps.Padding = {
  top: 60,
  right: 60,
  bottom: 60,
  left: 60,
};
const ROUTE_TIMEOUT_MS = 20_000;

const mapSizeConfiguration = {
  [MapSize.Fixed]: {
    width: '1280px',
    height: '720px',
  },
  [MapSize.Cover]: {
    width: '100%',
    height: '100%',
  },
};

export function Home() {
  const map = useRef<google.maps.Map>(undefined);
  const tripOverviewHandles = useRef<TripOverviewHandles>(undefined);

  const sheetId = useSheetStore((state) => state.sheetId);

  const tripTitle = useSheetTitle(sheetId);

  const {
    data: rawSheetData,
    loading: isDataLoading,
    error,
    refetch: refreshData,
  } = useGoogleSheets({
    apiKey: env.googleApiKey,
    sheetId,
  });

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: env.googleApiKey,
  });

  const roadTripData = useMemo(
    () =>
      parseGoogleSheetData(
        rawSheetData.find(({ id }) => id === env.tabName) ?? {
          data: [],
          id: '',
        },
      ),
    [rawSheetData],
  );

  const [activeDay, setActiveDay] = useState<string>();
  const [routeError, setRouteError] = useState<UserFacingError>();
  const [routeDirections, setRouteDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [replayDay, setReplayDay] = useState<string>();

  const travelDayData = useMemo(
    () => roadTripData.filter((day) => parseDistanceKm(day.distance) > 0),
    [roadTripData],
  );

  // The days in the list: the ones with driving and the flying days, which are shown apart
  const listDayData = useMemo(
    () => roadTripData.filter((day) => parseDistanceKm(day.distance) > 0 || isFlightDay(day)),
    [roadTripData],
  );

  // A flying day has no driving route, so there is nothing to ask the Directions service for
  const activeDirections = useMemo(() => {
    if (!activeDay) return travelDayData;

    const day = roadTripData.find(({ dayNumber }) => dayNumber === activeDay);

    return day && !isFlightDay(day) ? [day] : [];
  }, [activeDay, roadTripData, travelDayData]);

  // Nothing is routed on a flying day, so the route of the previous day is no longer shown
  useEffect(() => {
    if (activeDirections.length === 0) setRouteDirections(null);
  }, [activeDirections]);

  const showDay = useCallback((day?: string) => {
    setActiveDay(day);
    setRouteError(undefined);
  }, []);

  // What is known about each route, so the export can wait for the route of the day it shows
  const routeResults = useRef(new Map<string, RouteResult>());
  const routeWaiters = useRef<Array<{ routeId: string; resolve: (result: RouteResult) => void }>>(
    [],
  );

  const settleRoute = useCallback((routeId: string, result: RouteResult) => {
    routeResults.current.set(routeId, result);

    routeWaiters.current = routeWaiters.current.filter((waiter) => {
      if (waiter.routeId !== routeId) return true;

      waiter.resolve(result);
      return false;
    });
  }, []);

  const waitForRoute = useCallback(
    (routeId: string) =>
      new Promise<RouteResult>((resolve) => {
        const known = routeResults.current.get(routeId);

        if (known) {
          resolve(known);
          return;
        }

        const timeout = setTimeout(() => resolve('failed'), ROUTE_TIMEOUT_MS);

        routeWaiters.current.push({
          routeId,
          resolve: (result) => {
            clearTimeout(timeout);
            resolve(result);
          },
        });
      }),
    [],
  );

  // New data can mean new addresses, so earlier results no longer say anything
  useEffect(() => {
    routeResults.current.clear();
  }, [roadTripData]);

  const onRouteError = useCallback(
    (error?: UserFacingError, routeId?: string) => {
      setRouteError(error);
      if (error && routeId) settleRoute(routeId, 'failed');
    },
    [settleRoute],
  );

  const onRouteReady = useCallback(
    (routeId: string) => settleRoute(routeId, 'ready'),
    [settleRoute],
  );

  const onShowRouteClick = useCallback(
    (day: string) => {
      trackEvent(activeDay === day ? 'whole_trip_shown' : 'day_selected');
      setActiveDay(activeDay === day ? undefined : day);
      setRouteError(undefined);
    },
    [activeDay],
  );

  const onMapLoaded = useCallback((googleMap: google.maps.Map) => {
    map.current = googleMap;
  }, []);

  const getMap = useCallback(() => map.current, []);

  const dayExport = useDayExport({
    days: travelDayData,
    activeDay,
    getMap,
    showDay,
    waitForRoute,
  });

  const onMapSizeChange = useCallback((size: MapSize) => {
    const element = map.current?.getDiv();
    const { width, height } = mapSizeConfiguration[size];

    if (!element) throw new Error('Unable to change the size because the element does not exist');

    element.style.width = width;
    element.style.height = height;
  }, []);

  // Report once per loaded sheet, so a reload counts again but a re-render does not
  useEffect(() => {
    if (error) trackEvent('sheet_load_failed');
  }, [error]);

  useEffect(() => {
    if (!isDataLoading && roadTripData.length > 0) {
      trackEvent('sheet_loaded', { days: roadTripData.length });
    }
  }, [isDataLoading, roadTripData.length]);

  // The tab shows which trip is open, which helps when several are open at once
  useEffect(() => {
    document.title = tripTitle ? `${tripTitle} · Road Trip Visualizer` : 'Road Trip Visualizer';

    return () => {
      document.title = 'Road Trip Visualizer';
    };
  }, [tripTitle]);

  if (!sheetId) {
    return <Navigate to="/enter-sheet-id" replace />;
  }

  if (error) {
    return <Navigate to="/enter-sheet-id" replace state={{ error: describeSheetError(error) }} />;
  }

  // The sheet loaded, but it does not contain the tab with the stops
  if (!isDataLoading && !rawSheetData.some(({ id }) => id === env.tabName)) {
    return (
      <Navigate
        to="/enter-sheet-id"
        replace
        state={{
          error: describeMissingTab(
            env.tabName,
            rawSheetData.map(({ id }) => id),
          ),
        }}
      />
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-muted">
      <div className="map-grid absolute inset-0 flex items-center justify-center">
        {mapLoadError ? (
          <div className="p-8">
            <ErrorAlert
              className="max-w-md"
              error={{
                title: 'Google Maps failed to load',
                message:
                  'Check your internet connection, and that the API key allows the Maps JavaScript API on this domain.',
              }}
            />
          </div>
        ) : !isDataLoading && isMapLoaded ? (
          <GoogleMap
            mapContainerClassName="map-container"
            mapContainerStyle={{
              width: '100%',
              height: '100%',
            }}
            options={{ disableDefaultUI: true, styles: mapStyles }}
            zoom={8}
            onLoad={onMapLoaded}
          >
            {activeDirections.length > 0 && (
              <Directions
                data={activeDirections}
                trip={travelDayData}
                onError={onRouteError}
                onReady={onRouteReady}
                onRouteChange={setRouteDirections}
                padding={dayExport.isExporting ? EXPORT_PADDING : undefined}
              />
            )}
            <FlightLayer
              days={roadTripData}
              activeDay={activeDay}
              padding={dayExport.isExporting ? EXPORT_PADDING : undefined}
            />
          </GoogleMap>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-brand" />
            <span className="text-sm text-muted-foreground">Loading your trip...</span>
          </div>
        )}
      </div>

      <aside className="glass absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 max-h-[60dvh] overflow-hidden rounded-2xl md:inset-y-8 md:right-auto md:max-h-none md:w-[380px]">
        <Sidebar
          title={tripTitle}
          data={listDayData}
          activeDay={activeDay}
          onDayClick={onShowRouteClick}
          onFullOverviewClick={() => {
            trackEvent('overview_toggled');
            tripOverviewHandles.current?.toggleDrawer();
          }}
        />
      </aside>

      <Navigation
        className="absolute top-3 right-3 z-10"
        onMapSizeChange={onMapSizeChange}
        onUpdateData={refreshData}
        isDataLoading={isDataLoading}
      />

      {(dayExport.notice ?? routeError) && (
        <ErrorAlert
          className="absolute top-16 right-3 left-3 z-10 md:left-auto md:max-w-md"
          error={(dayExport.notice ?? routeError)!}
        />
      )}

      <div className="absolute top-16 right-3 z-10 flex flex-col items-end gap-2 md:top-auto md:right-4 md:bottom-8">
        {activeDay && (
          <Button
            size="lg"
            className="rounded-full bg-card text-foreground shadow-lg hover:bg-card/90 max-md:h-11 max-md:px-4"
            aria-label="Clear selection"
            onClick={() => {
              trackEvent('whole_trip_shown');
              setActiveDay(undefined);
              setRouteError(undefined);
            }}
          >
            <X data-icon="inline-start" />
            Show whole trip
          </Button>
        )}
        <Button
          size="lg"
          className="rounded-full bg-card text-foreground shadow-lg hover:bg-card/90 max-md:size-11 max-md:gap-0 max-md:p-0"
          aria-label={isReplayOpen ? 'Close replay' : 'Replay trip'}
          aria-pressed={isReplayOpen}
          disabled={
            isDataLoading ||
            travelDayData.length === 0 ||
            activeDirections.length === 0 ||
            dayExport.isExporting
          }
          onClick={() => setIsReplayOpen((open) => !open)}
        >
          <Car data-icon="inline-start" />
          <span className="max-md:sr-only">{isReplayOpen ? 'Close replay' : 'Replay trip'}</span>
        </Button>
        <ExportAllButton
          onClick={() => void dayExport.start()}
          disabled={dayExport.isExporting || isDataLoading || travelDayData.length === 0}
        />
        <ScreenshotButton data={roadTripData} activeDay={activeDay} />
      </div>

      {!isDataLoading && (
        <DayLoadChart
          data={roadTripData}
          activeDay={activeDay}
          replayDay={replayDay}
          onDayClick={onShowRouteClick}
          className="absolute z-10 hidden lg:bottom-8 lg:left-[404px] lg:block lg:w-[min(640px,calc(100vw-404px-240px))]"
        />
      )}

      {isReplayOpen && !isDataLoading && activeDirections.length > 0 && (
        <TripReplay
          days={activeDirections}
          directions={routeDirections}
          getMap={getMap}
          onDayChange={setReplayDay}
          onClose={() => setIsReplayOpen(false)}
        />
      )}

      {dayExport.progress && (
        <ExportOverlay progress={dayExport.progress} onCancel={dayExport.cancel} />
      )}

      {!isDataLoading && (
        <TripOverview
          data={roadTripData}
          activeDay={activeDay}
          onDayClick={onShowRouteClick}
          handlesRef={tripOverviewHandles}
        />
      )}
    </div>
  );
}
