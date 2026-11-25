import { describe, expect, it } from 'vite-plus/test';
import { getGreatCircleMidpoint, isFlightDay, needsRouteLookup } from './flights';

const flight = {
  morningLocation: 'Utrecht',
  eveningLocation: 'Las Vegas, NV, USA',
  distance: '0 km',
  time: '0:00:00',
};

describe('isFlightDay', () => {
  it('is a flight when the day moves between places without driving', () => {
    expect(isFlightDay(flight)).toBe(true);
  });

  it('is not a flight when there is driving', () => {
    expect(isFlightDay({ ...flight, distance: '183 km', time: '1:53:25' })).toBe(false);
  });

  it('is not a flight on a rest day, where the day starts and ends in the same place', () => {
    expect(isFlightDay({ ...flight, eveningLocation: ' utrecht ' })).toBe(false);
  });

  it('is not a flight when the sheet could not calculate the day', () => {
    expect(isFlightDay({ ...flight, distance: '#ERROR!', time: '#ERROR!' })).toBe(false);
    expect(isFlightDay({ ...flight, time: '#N/A' })).toBe(false);
  });

  it('is not a flight when a place is missing', () => {
    expect(isFlightDay({ ...flight, eveningLocation: '' })).toBe(false);
    expect(isFlightDay({ ...flight, morningLocation: '  ' })).toBe(false);
  });
});

describe('needsRouteLookup', () => {
  const broken = { ...flight, distance: '#ERROR!', time: '#ERROR!' };

  it('needs a lookup when the sheet could not calculate a day between two places', () => {
    expect(needsRouteLookup(broken)).toBe(true);
    expect(needsRouteLookup({ ...broken, distance: '0 km' })).toBe(true);
  });

  it('does not when the day is known, or stays in one place', () => {
    expect(needsRouteLookup(flight)).toBe(false);
    expect(needsRouteLookup({ ...broken, distance: '218 km' })).toBe(false);
    expect(needsRouteLookup({ ...broken, eveningLocation: 'utrecht' })).toBe(false);
  });
});

describe('getGreatCircleMidpoint', () => {
  it('is the middle between two places on the same meridian', () => {
    const { lat, lng } = getGreatCircleMidpoint({ lat: 0, lng: 10 }, { lat: 40, lng: 10 });

    expect(lat).toBeCloseTo(20);
    expect(lng).toBeCloseTo(10);
  });

  it('bends towards the pole on a long east-west flight', () => {
    // Utrecht to Las Vegas goes over Greenland, so the middle is far north of both
    const { lat } = getGreatCircleMidpoint({ lat: 52.09, lng: 5.12 }, { lat: 36.11, lng: -115.17 });

    expect(lat).toBeGreaterThan(60);
  });

  it('keeps the longitude between -180 and 180 across the date line', () => {
    const { lng } = getGreatCircleMidpoint({ lat: 0, lng: 170 }, { lat: 0, lng: -170 });

    expect(Math.abs(lng)).toBeCloseTo(180);
  });
});
