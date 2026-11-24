import { describe, expect, it } from 'vite-plus/test';
import { getRouteId } from './routeId';

describe('getRouteId', () => {
  it('uses the first and the last day', () => {
    expect(getRouteId([{ dayNumber: '1' }, { dayNumber: '3' }, { dayNumber: '5' }])).toBe('1.5');
  });

  it('uses the same day twice for a single day', () => {
    expect(getRouteId([{ dayNumber: '3' }])).toBe('3.3');
  });
});
