import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useCallback } from 'react';
import { toKebabCase } from '../../utils/toKebabCase';
import { RoadTrip } from '../../types/roadTrip.types';
import { trackEvent } from '../../utils/analytics';

type ScreenShotButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick'> & {
  data: RoadTrip;
  activeDay?: string;
  targetSelector?: string;
};

function ScreenshotButton({
  data,
  activeDay,
  targetSelector = '.map-container',
  ...restProps
}: ScreenShotButtonProps) {
  // Does not work correctly in chrome 😭
  const onScreenshotClick = useCallback(() => {
    trackEvent('screenshot_taken', { scope: activeDay ? 'day' : 'trip' });
    const targetElement = document.body.querySelector<HTMLDivElement>(targetSelector);

    if (!targetElement)
      throw new Error('Target element cannot be found, unable to take screenshot');

    void import('html2canvas-pro')
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
    <Button
      {...restProps}
      size="lg"
      className="rounded-full shadow-lg"
      aria-label="Take screenshot"
      onClick={onScreenshotClick}
    >
      <Camera data-icon="inline-start" />
      Take screenshot
    </Button>
  );
}

export default ScreenshotButton;
