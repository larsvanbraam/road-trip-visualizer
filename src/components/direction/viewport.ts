/**
 * Room to keep free around the route so it is not hidden behind the floating panel and toolbar
 */
export function getViewportPadding(): google.maps.Padding {
  const isDesktop = window.innerWidth >= 768;

  return isDesktop
    ? { top: 80, right: 80, bottom: 80, left: 420 }
    : // Phones: the sheet is folded to a bar, the action buttons stack on the right edge
      { top: 80, right: 72, bottom: 180, left: 32 };
}
