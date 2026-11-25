import { describe, expect, it } from 'vite-plus/test';
import {
  describeDirectionsStatus,
  describeFlightLookupStatus,
  describeMapsApiError,
  parseMapsApiError,
  describeMissingTab,
  describeSheetError,
} from './errors';

const httpError = (status: number) =>
  new Error('Request to https://sheets.googleapis.com/v4/x?key=SECRET failed', {
    cause: { status },
  });

describe('describeSheetError', () => {
  it.each([
    [400, 'Invalid sheet id or API key'],
    [403, 'No access to this sheet'],
    [404, 'Sheet not found'],
    [429, 'Too many requests'],
    [503, 'Google is having problems'],
  ])('explains HTTP %i', (status, title) => {
    expect(describeSheetError(httpError(status)).title).toBe(title);
  });

  it('treats errors without a status as a connection problem', () => {
    expect(describeSheetError(new TypeError('Failed to fetch')).title).toBe(
      'Unable to load the sheet',
    );
    expect(describeSheetError('boom').title).toBe('Unable to load the sheet');
  });

  it('never leaks the request url or API key', () => {
    const { title, message } = describeSheetError(httpError(403));

    expect(`${title} ${message}`).not.toContain('SECRET');
    expect(`${title} ${message}`).not.toContain('googleapis');
  });
});

describe('describeMissingTab', () => {
  it('lists the tabs that do exist', () => {
    const { message } = describeMissingTab('Stops', ['Sheet1', 'Notes']);

    expect(message).toContain('Sheet1, Notes');
  });

  it('works when the sheet has no tabs', () => {
    expect(describeMissingTab('Stops', []).message).not.toContain('Found');
  });
});

describe('describeDirectionsStatus', () => {
  it('names the addresses when no route is found', () => {
    const { message } = describeDirectionsStatus('ZERO_RESULTS', 'Amsterdam', 'Reykjavik');

    expect(message).toContain('Amsterdam');
    expect(message).toContain('Reykjavik');
  });

  it('points at the quota and the API setup', () => {
    expect(describeDirectionsStatus('OVER_QUERY_LIMIT', 'a', 'b').title).toBe(
      'Too many route requests',
    );
    expect(describeDirectionsStatus('REQUEST_DENIED', 'a', 'b').message).toContain(
      'Directions API',
    );
  });

  it('falls back to the raw status for unknown cases', () => {
    expect(describeDirectionsStatus('UNKNOWN_ERROR', 'a', 'b').message).toContain('UNKNOWN_ERROR');
  });
});

describe('temporary failures', () => {
  it('lets the user try again after a quota error', () => {
    expect(describeDirectionsStatus('OVER_QUERY_LIMIT', 'a', 'b').retryable).toBe(true);
    expect(describeSheetError(httpError(429)).retryable).toBe(true);
    expect(describeFlightLookupStatus('OVER_QUERY_LIMIT').retryable).toBe(true);
  });

  it('does not offer a retry for problems a retry cannot fix', () => {
    expect(describeDirectionsStatus('ZERO_RESULTS', 'a', 'b').retryable).toBeUndefined();
    expect(describeDirectionsStatus('REQUEST_DENIED', 'a', 'b').retryable).toBeUndefined();
  });
});

describe('Maps JavaScript API errors', () => {
  it('reads the error name from the console message', () => {
    expect(
      parseMapsApiError('Google Maps JavaScript API error: OverQuotaMapError\nhttps://x'),
    ).toBe('OverQuotaMapError');
    expect(parseMapsApiError('Something else')).toBeUndefined();
    expect(parseMapsApiError(new Error('x'))).toBeUndefined();
  });

  it('explains a used up quota and allows a retry', () => {
    const error = describeMapsApiError('OverQuotaMapError');

    expect(error.title).toBe('Google Maps limit reached');
    expect(error.retryable).toBe(true);
  });

  it('falls back to a key problem for unknown errors', () => {
    expect(describeMapsApiError('AuthFailure').title).toBe('Google Maps rejected the API key');
  });
});
