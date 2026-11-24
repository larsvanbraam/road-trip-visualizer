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
import { useSheetStore } from '../../state/sheetState';

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
    () => roadTripData.filter((day) => Number(day.distance.replace(' km', '')) > 0),
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
    <div className="flex min-h-screen flex-col">
      <Navigation
        onMapSizeChange={onMapSizeChange}
        onUpdateData={refreshData}
        isDataLoading={isDataLoading}
      />
      <div className="flex grow flex-col md:flex-row">
        <div className="h-full overflow-hidden md:w-1/3 lg:w-1/4 xl:w-1/6">
          <Sidebar
            data={travelDayData}
            activeDay={activeDay}
            onDayClick={onShowRouteClick}
            onFullOverviewClick={() => {
              tripOverviewHandles.current?.toggleDrawer();
            }}
          />
        </div>
        <div className="map-grid relative min-h-96 md:w-2/3 lg:w-3/4 xl:w-5/6">
          {mapLoadError ? (
            <div className="flex h-screen items-center justify-center p-8">
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
              options={{ disableDefaultUI: true }}
              zoom={8}
              onLoad={onMapLoaded}
            >
              <Directions data={activeDirections} onError={setRouteError} />
            </GoogleMap>
          ) : (
            <div className="flex h-screen flex-col items-center justify-center gap-2">
              <Loader2 className="size-8 animate-spin" />
              <span className="text-xs text-muted-foreground">Loading data...</span>
            </div>
          )}

          {routeError && (
            <ErrorAlert className="absolute top-4 left-4 z-10 max-w-md" error={routeError} />
          )}

          {activeDay && (
            <Button
              size="lg"
              className="absolute right-4 bottom-16 rounded-full bg-destructive text-white hover:bg-destructive/80"
              aria-label="Clear selection"
              onClick={() => {
                setActiveDay(undefined);
                setRouteError(undefined);
              }}
            >
              <X data-icon="inline-start" />
              Clear selection
            </Button>
          )}

          <ScreenshotButton data={roadTripData} activeDay={activeDay} />
        </div>
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
