/**
 * Room to keep free around the route so it is not hidden behind the floating panel and toolbar
 */
export function getViewportPadding(): google.maps.Padding {
  const isDesktop = window.innerWidth >= 768;

  return isDesktop
    ? { top: 80, right: 80, bottom: 80, left: 420 }
    : { top: 80, right: 40, bottom: window.innerHeight * 0.45 + 40, left: 40 };
}
