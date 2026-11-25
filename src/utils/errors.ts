export type UserFacingError = {
  title: string;
  message: string;
};

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
        message: 'The Google Sheets quota has been reached. Wait a minute and try again.',
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
        message: 'The Directions quota has been reached. Wait a moment and select the day again.',
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
      };
  }
}
