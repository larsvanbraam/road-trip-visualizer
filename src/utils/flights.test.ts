import { describe, expect, it } from 'vite-plus/test';
import {
  getGreatCircleMidpoint,
  getTravelDays,
  isDrivingDay,
  isFlightDay,
  needsRouteLookup,
} from './flights';

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

describe('isDrivingDay', () => {
  it('is a driving day when the sheet gives either a distance or a drive time', () => {
    expect(isDrivingDay({ distance: '183 km', time: '#ERROR!' })).toBe(true);
    expect(isDrivingDay({ distance: '#ERROR!', time: '1:53:25' })).toBe(true);
  });

  it('is not when neither is known or both are zero', () => {
    expect(isDrivingDay({ distance: '#ERROR!', time: '#ERROR!' })).toBe(false);
    expect(isDrivingDay({ distance: '0 km', time: '0:00:00' })).toBe(false);
    expect(isDrivingDay({})).toBe(false);
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

describe('getTravelDays', () => {
  const place = (
    morningLocation: string,
    eveningLocation: string,
    distance: string,
    time: string,
  ) => ({
    morningLocation,
    eveningLocation,
    distance,
    time,
  });
  const drive = place('A', 'B', '100 km', '1:00:00');
  const unknown = place('B', 'C', '#ERROR!', '#ERROR!');
  const flightDay = place('C', 'D', '0 km', '0:00:00');
  const rest = place('D', 'D', '0 km', '0:00:00');

  it('assumes days the sheet could not calculate are drives, so one request is enough', () => {
    expect(getTravelDays([drive, unknown, flightDay, rest], false)).toEqual([drive, unknown]);
  });

  it('waits for every unknown day to be looked up once the assumption failed', () => {
    expect(getTravelDays([drive, unknown, flightDay], true)).toEqual([]);
  });

  it('leaves out the flights and rest days when all days are known', () => {
    const known = { ...unknown, distance: '80 km', time: '0:50:00' };

    expect(getTravelDays([drive, known, flightDay, rest], true)).toEqual([drive, known]);
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
