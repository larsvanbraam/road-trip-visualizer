import { Loader2, X } from 'lucide-react';
import { ErrorAlert } from '../../components/error-alert/ErrorAlert';
import { describeMissingTab, describeSheetError, UserFacingError } from '../../utils/errors';
import { Button } from '@/components/ui/button';
import { env } from '../../config/env';
import Navigation, { MapSize } from '../../components/navigation/Navigation';
import Sidebar from '../../components/sidebar/Sidebar';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import Directions from '../../components/direction/Directions';
import ScreenshotButton from '../../components/screenshot-button/ScreenshotButton';
import TripOverview, { TripOverviewHandles } from '../../components/trip-overview/TripOverview';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import useGoogleSheets from 'use-google-sheets';
import { parseGoogleSheetData } from '../../utils/parseGoogleSheetData';
import { Navigate } from 'react-router-dom';
import { parseDistanceKm } from '../../utils/tripStats';
import { useSheetStore } from '../../state/sheetState';

// Hide points of interest and transit stops so the route stands out
const mapStyles: Array<google.maps.MapTypeStyle> = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

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

  const travelDayData = useMemo(
    () => roadTripData.filter((day) => parseDistanceKm(day.distance) > 0),
    [roadTripData],
  );

  const activeDirections = useMemo(
    () =>
      activeDay ? [roadTripData.find(({ dayNumber }) => dayNumber === activeDay)!] : travelDayData,
    [activeDay, roadTripData, travelDayData],
  );

  const onShowRouteClick = useCallback(
    (day: string) => {
      setActiveDay(activeDay === day ? undefined : day);
      setRouteError(undefined);
    },
    [activeDay],
  );

  const onMapLoaded = useCallback((googleMap: google.maps.Map) => {
    map.current = googleMap;
  }, []);

  const onMapSizeChange = useCallback((size: MapSize) => {
    const element = map.current?.getDiv();
    const { width, height } = mapSizeConfiguration[size];

    if (!element) throw new Error('Unable to change the size because the element does not exist');

    element.style.width = width;
    element.style.height = height;
  }, []);

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
    <div className="relative h-screen w-full overflow-hidden bg-muted">
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
            <Directions data={activeDirections} onError={setRouteError} />
          </GoogleMap>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-brand" />
            <span className="text-sm text-muted-foreground">Loading your trip...</span>
          </div>
        )}
      </div>

      <aside className="glass absolute inset-x-3 bottom-8 z-10 max-h-[45vh] overflow-hidden rounded-2xl md:inset-y-3 md:right-auto md:bottom-10 md:max-h-none md:w-[380px]">
        <Sidebar
          data={travelDayData}
          activeDay={activeDay}
          onDayClick={onShowRouteClick}
          onFullOverviewClick={() => {
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

      {routeError && (
        <ErrorAlert className="absolute top-16 right-3 z-10 max-w-md" error={routeError} />
      )}

      <div className="absolute right-4 bottom-8 z-10 flex flex-col items-end gap-2">
        {activeDay && (
          <Button
            size="lg"
            className="rounded-full bg-card text-foreground shadow-lg hover:bg-card/90"
            aria-label="Clear selection"
            onClick={() => {
              setActiveDay(undefined);
              setRouteError(undefined);
            }}
          >
            <X data-icon="inline-start" />
            Show whole trip
          </Button>
        )}
        <ScreenshotButton data={roadTripData} activeDay={activeDay} />
      </div>

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
