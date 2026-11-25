import { useCallback, useEffect, useRef, useState } from 'react';
import { RoadTrip } from '../types/roadTrip.types';
import {
  buildExportTargets,
  canvasToPngBytes,
  createZip,
  downloadBlob,
  ExportFile,
} from '../utils/dayExport';
import { UserFacingError } from '../utils/errors';
import { trackEvent } from '../utils/analytics';

export type RouteResult = 'ready' | 'failed';

export type ExportProgress = {
  current: number;
  total: number;
  label: string;
};

type UseDayExportOptions = {
  /** The days with driving, one screenshot is taken for each of them */
  days: RoadTrip;
  activeDay?: string;
  getMap: () => google.maps.Map | undefined;
  /** Show the route of a day, or the whole trip when no day is given */
  showDay: (dayNumber?: string) => void;
  /** Resolves when the route with this id is drawn, or when it turns out it cannot be made */
  waitForRoute: (routeId: string) => Promise<RouteResult>;
};

/** The size of the screenshots, so that they are the same on every screen */
const EXPORT_SIZE = { width: 1280, height: 720 };
/** Time for map tiles and markers to finish drawing after the map stopped moving */
const SETTLE_DELAY_MS = 700;
const IDLE_TIMEOUT_MS = 2500;
const NOTICE_DURATION_MS = 15_000;
const ZIP_FILE_NAME = 'road-trip-screenshots.zip';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function waitForMapIdle(map: google.maps.Map): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, IDLE_TIMEOUT_MS);

    google.maps.event.addListenerOnce(map, 'idle', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

/**
 * Take a screenshot of the whole trip and of every travel day, and download them as one zip. The map
 * is temporarily resized and switched between days, and put back as it was afterwards.
 */
export function useDayExport({
  days,
  activeDay,
  getMap,
  showDay,
  waitForRoute,
}: UseDayExportOptions) {
  const [progress, setProgress] = useState<ExportProgress>();
  const [notice, setNotice] = useState<UserFacingError>();
  const isCancelled = useRef(false);

  // The notice is only a heads up, so it goes away by itself
  useEffect(() => {
    if (!notice) return;

    const timeout = setTimeout(() => setNotice(undefined), NOTICE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [notice]);

  // Leaving the page must not keep taking screenshots of a map that is gone
  useEffect(
    () => () => {
      isCancelled.current = true;
    },
    [],
  );

  const cancel = useCallback(() => {
    isCancelled.current = true;
  }, []);

  const start = useCallback(async () => {
    const map = getMap();
    const element = map?.getDiv();

    if (!map || !element) return;

    const targets = buildExportTargets(days);
    const previousStyle = {
      width: element.style.width,
      height: element.style.height,
      flexShrink: element.style.flexShrink,
    };
    const files: Array<ExportFile> = [];
    const skipped: Array<string> = [];

    trackEvent('export_started', { days: days.length });
    isCancelled.current = false;
    setNotice(undefined);
    setProgress({
      current: 0,
      total: targets.length,
      label: 'Getting ready...',
    });

    try {
      const { default: html2canvas } = await import('html2canvas-pro');

      element.style.width = `${EXPORT_SIZE.width}px`;
      element.style.height = `${EXPORT_SIZE.height}px`;
      // On a smaller screen the map would shrink to fit, which would change the size of the images
      element.style.flexShrink = '0';
      google.maps.event.trigger(map, 'resize');
      await sleep(SETTLE_DELAY_MS);

      for (const [index, target] of targets.entries()) {
        if (isCancelled.current) break;

        setProgress({
          current: index + 1,
          total: targets.length,
          label: target.label,
        });

        showDay(target.dayNumber);

        if ((await waitForRoute(target.routeId)) === 'failed') {
          skipped.push(target.label);
          continue;
        }

        await waitForMapIdle(map);
        await sleep(SETTLE_DELAY_MS);

        const canvas = await html2canvas(element, { useCORS: true, scale: 1 });
        files.push({
          name: target.fileName,
          data: await canvasToPngBytes(canvas),
        });
      }

      if (isCancelled.current) trackEvent('export_cancelled');

      if (!isCancelled.current && files.length > 0) {
        trackEvent('export_completed', {
          files: files.length,
          skipped: skipped.length,
        });
        downloadBlob(
          new Blob([createZip(files).slice()], { type: 'application/zip' }),
          ZIP_FILE_NAME,
        );
      }

      if (!isCancelled.current && skipped.length > 0) {
        setNotice({
          title: `Exported ${files.length} of ${targets.length} screenshots`,
          message: `No route could be made for: ${skipped.join('; ')}. Check these addresses in your sheet, or try again later when the Google API limit was reached.`,
        });
      }
    } catch {
      setNotice({
        title: 'Unable to export the screenshots',
        message: 'Something went wrong while taking the screenshots. Try again.',
      });
    } finally {
      element.style.width = previousStyle.width;
      element.style.height = previousStyle.height;
      element.style.flexShrink = previousStyle.flexShrink;
      google.maps.event.trigger(map, 'resize');
      showDay(activeDay);
      setProgress(undefined);
    }
  }, [activeDay, days, getMap, showDay, waitForRoute]);

  return {
    start,
    cancel,
    progress,
    notice,
    isExporting: progress !== undefined,
  };
}
