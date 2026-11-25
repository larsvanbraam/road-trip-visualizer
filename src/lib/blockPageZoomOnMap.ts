/**
 * A trackpad pinch reaches the browser as a ctrl+wheel event. Google Maps handles it on its own
 * surface, but not when the cursor sits on a marker or route overlay, so the browser zooms the
 * whole page instead. Cancel those events (and Safari's gesture events) anywhere inside the map.
 */
const isOnMap = (event: Event) =>
  event.target instanceof Element && event.target.closest('.map-container') !== null;

export const blockPageZoomOnMap = () => {
  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey && isOnMap(event)) event.preventDefault();
    },
    { passive: false },
  );

  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, (event) => isOnMap(event) && event.preventDefault());
  }
};
