import { useEffect, useState } from 'react';
import { describeMapsApiError, parseMapsApiError, UserFacingError } from '../utils/errors';

/**
 * Tells when the Maps JavaScript API cannot show the map. Google reports a rejected key through the
 * global gm_authFailure callback, but other problems, such as the quota being used up, are only
 * written to the console, so that is watched as well. Everything is passed on to the console.
 */
export function useMapsApiError(): UserFacingError | undefined {
  const [error, setError] = useState<UserFacingError>();

  useEffect(() => {
    const originalConsoleError = console.error;

    window.gm_authFailure = () => setError(describeMapsApiError('AuthFailure'));

    console.error = (...args: Array<unknown>) => {
      const name = args.map(parseMapsApiError).find(Boolean);

      if (name) setError(describeMapsApiError(name));
      originalConsoleError.apply(console, args);
    };

    return () => {
      delete window.gm_authFailure;
      console.error = originalConsoleError;
    };
  }, []);

  return error;
}
