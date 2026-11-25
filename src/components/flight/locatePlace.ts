/**
 * Places that were looked up for as long as the page is open. Like the routes, only kept in memory.
 */
const cache = new Map<string, Promise<google.maps.LatLngLiteral | undefined>>();

/**
 * Find where a place is. The Geocoding API is not part of the setup, so this asks the Directions
 * service for a route from the place to itself, which tells where the place is without needing
 * anything else to be enabled on the API key. Resolves to nothing when the place is not found, and
 * rejects with the Google status (for example "OVER_QUERY_LIMIT") when the lookup itself failed.
 */
export function locatePlace(place: string): Promise<google.maps.LatLngLiteral | undefined> {
  const known = cache.get(place);
  if (known) return known;

  const lookup = new google.maps.DirectionsService()
    .route({
      origin: place,
      destination: place,
      travelMode: google.maps.TravelMode.DRIVING,
    })
    .then((result) => result.routes[0]?.legs[0]?.start_location.toJSON())
    .catch((error: unknown) => {
      const code = (error as { code?: unknown } | null)?.code;

      // Not finding the place is an answer, anything else is a problem with the lookup
      if (code === 'NOT_FOUND' || code === 'ZERO_RESULTS') return undefined;
      throw typeof code === 'string' ? code : 'UNKNOWN_ERROR';
    });

  // A failed lookup can be tried again, for example after a quota error
  lookup.then(
    (position) => {
      if (!position) cache.delete(place);
    },
    () => cache.delete(place),
  );

  cache.set(place, lookup);
  return lookup;
}
