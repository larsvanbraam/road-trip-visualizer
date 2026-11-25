export type UserFacingError = {
  title: string;
  message: string;
  /** The problem is temporary (for example a quota), so trying again later can work */
  retryable?: boolean;
};

/** Statuses that say Google is busy or the quota is used up, as opposed to a problem with the input */
export function isTemporaryDirectionsStatus(status: string): boolean {
  return status === 'OVER_QUERY_LIMIT' || status === 'UNKNOWN_ERROR';
}

/**
 * Read the HTTP status the Google Sheets request failed with. The library attaches it as the
 * error cause. Note that the error message itself contains the request url (including the API key),
 * so it must never be shown to the user.
 */
function getHttpStatus(error: unknown): number | undefined {
  if (error instanceof Error && typeof error.cause === 'object' && error.cause !== null) {
    const { status } = error.cause as { status?: unknown };
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/**
 * Turn a failed Google Sheets request into something the user can act on
 */
export function describeSheetError(error: unknown): UserFacingError {
  const status = getHttpStatus(error);

  switch (status) {
    case 400:
      return {
        title: 'Invalid sheet id or API key',
        message:
          'Google rejected the request. Check that the sheet id is correct and that the API key is valid.',
      };
    case 401:
    case 403:
      return {
        title: 'No access to this sheet',
        message:
          'Make sure the sheet is shared as "Anyone with the link can view", the Google Sheets API is enabled for your key and the key is allowed on this domain.',
      };
    case 404:
      return {
        title: 'Sheet not found',
        message: 'There is no sheet with this id. Copy the id from the sheet url and try again.',
      };
    case 429:
      return {
        title: 'Too many requests',
        message:
          'The Google Sheets limit of the API key has been reached. Wait a minute and try again.',
        retryable: true,
      };
    default:
      if (status !== undefined && status >= 500) {
        return {
          title: 'Google is having problems',
          message: 'Google Sheets returned a server error. Try again in a moment.',
        };
      }
      return {
        title: 'Unable to load the sheet',
        message: 'Check your internet connection and try again.',
      };
  }
}

/**
 * Explain that the tab with the stops does not exist in the loaded sheet
 */
export function describeMissingTab(tabName: string, availableTabs: Array<string>): UserFacingError {
  const available = availableTabs.length > 0 ? ` Found: ${availableTabs.join(', ')}.` : '';

  return {
    title: `Tab "${tabName}" not found`,
    message: `The sheet has no tab named "${tabName}".${available} Create the tab or change VITE_TAB_NAME.`,
  };
}

/**
 * Explain why a route could not be calculated by the Google Directions service
 */
export function describeDirectionsStatus(
  status: string,
  from: string,
  to: string,
): UserFacingError {
  switch (status) {
    case 'NOT_FOUND':
    case 'ZERO_RESULTS':
      return {
        title: 'No route found',
        message: `Could not find a driving route from "${from}" to "${to}". Check the addresses in your sheet.`,
      };
    case 'OVER_QUERY_LIMIT':
      return {
        title: 'Too many route requests',
        message:
          'The daily or per-minute limit of the Google API key has been reached. Wait a moment and try again, or try again tomorrow if the daily limit is used up.',
        retryable: true,
      };
    case 'MAX_WAYPOINTS_EXCEEDED':
      return {
        title: 'Too many stops for one route',
        message:
          'Google allows at most 25 stops and via points in one route. Select a single day to see its route.',
      };
    case 'REQUEST_DENIED':
      return {
        title: 'Directions are not available',
        message: 'Enable the Directions API for your Google API key.',
      };
    default:
      return {
        title: 'Unable to calculate the route',
        message: `Google returned "${status}" for the route from "${from}" to "${to}".`,
        retryable: status === 'UNKNOWN_ERROR',
      };
  }
}

/**
 * Explain that the flights could not be placed on the map, which needs the same Directions quota
 */
export function describeFlightLookupStatus(status: string): UserFacingError {
  if (status === 'OVER_QUERY_LIMIT') {
    return {
      title: 'Flights could not be shown',
      message:
        'The limit of the Google API key has been reached, so the flights are not on the map. Wait a moment and try again.',
      retryable: true,
    };
  }

  return {
    title: 'Flights could not be shown',
    message: `Google returned "${status}" while looking up the flight locations.`,
    retryable: isTemporaryDirectionsStatus(status),
  };
}

/**
 * Read the error name from what the Maps JavaScript API writes to the console when it cannot load
 * the map, for example "Google Maps JavaScript API error: OverQuotaMapError". Google offers no
 * callback for these, so the console message is the only signal.
 */
export function parseMapsApiError(message: unknown): string | undefined {
  if (typeof message !== 'string') return undefined;

  return /Google Maps JavaScript API error: (\w+)/.exec(message)?.[1];
}

/**
 * Explain why the Maps JavaScript API cannot show the map. The name is the error Google reports,
 * or "AuthFailure" for the global authentication callback.
 */
export function describeMapsApiError(name: string): UserFacingError {
  switch (name) {
    case 'OverQuotaMapError':
      return {
        title: 'Google Maps limit reached',
        message:
          'The map loads of the Google API key have been used up. Try again later, or tomorrow if the daily limit is reached.',
        retryable: true,
      };
    case 'BillingNotEnabledMapError':
      return {
        title: 'Billing is not enabled',
        message: 'Enable billing for the Google Cloud project of your API key to show the map.',
      };
    case 'RefererNotAllowedMapError':
      return {
        title: 'This domain is not allowed',
        message: 'Add this domain to the allowed websites of your Google API key.',
      };
    case 'ApiNotActivatedMapError':
    case 'ApiTargetBlockedMapError':
      return {
        title: 'Maps JavaScript API is not enabled',
        message: 'Enable the Maps JavaScript API for your Google API key.',
      };
    default:
      return {
        title: 'Google Maps rejected the API key',
        message:
          'Check that the key is valid, that billing is enabled and that the key is allowed on this domain.',
      };
  }
}
