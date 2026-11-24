import { ScreenshotMonitor as ScreenshotMonitorIcon } from '@mui/icons-material';
import { Fab, FabProps } from '@mui/material';
import React, { useCallback } from 'react';
import { RoadTrip } from '../../types/roadTrip.types';

type ScreenShotButtonProps = FabProps & {
  data: RoadTrip;
  activeDay?: string;
  targetSelector?: string;
};

/**
 * Convert a string to a lowercase, dash separated file name
 */
function toKebabCase(value: string): string {
  return (
    value
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .match(/[A-Za-z\d]+/g)
      ?.join('-')
      .toLowerCase() ?? ''
  );
}

function ScreenshotButton({
  data,
  activeDay,
  targetSelector = '.map-container',
  ...restProps
}: ScreenShotButtonProps) {
  // Does not work correctly in chrome 😭
  const onScreenshotClick = useCallback(() => {
    const targetElement = document.body.querySelector<HTMLDivElement>(targetSelector);

    if (!targetElement)
      throw new Error('Target element cannot be found, unable to take screenshot');

    void import('html2canvas')
      .then(({ default: html2canvas }) => html2canvas(targetElement, { useCORS: true }))
      .then((canvas) => {
        const anchor = document.createElement('a');
        const activeDayData = data.find(({ dayNumber }) => dayNumber === activeDay);

        anchor.download = activeDayData
          ? toKebabCase(
              `day-${activeDayData.dayNumber}-${activeDayData.morningLocation}-${activeDayData.eveningLocation}.png`,
            )
          : 'full-route.png';
        anchor.href = canvas.toDataURL();
        anchor.click();
      });
  }, [activeDay, data, targetSelector]);

  return (
    <Fab
      {...restProps}
      sx={{ position: 'absolute', bottom: 16, right: 16 }}
      variant="extended"
      size="medium"
      color="primary"
      aria-label="Take screenshot"
      onClick={onScreenshotClick}
    >
      <ScreenshotMonitorIcon sx={{ mr: 1 }} />
      Take screenshot
    </Fab>
  );
}

export default ScreenshotButton;
