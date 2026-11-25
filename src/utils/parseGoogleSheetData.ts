import type useGoogleSheets from 'use-google-sheets';
import { RoadTrip, RoadTripStop } from '../types/roadTrip.types';
import { parseDistanceKm, parseDurationMinutes } from './tripStats';

type Sheet = ReturnType<typeof useGoogleSheets>['data'][number];

/**
 * Map the Google Sheet columns to something we can use in the application
 */
const sheetColumnToRoadTripColumn: Record<string, keyof RoadTripStop> = {
  Day: 'dayNumber',
  Date: 'date',
  'Distance (km)': 'distance',
  'Evening location (address)': 'eveningLocation',
  'Morning location (address)': 'morningLocation',
  'Through (address)': 'afternoonLocation',
  'Travel time': 'time',
} as const;

/**
 * The Sheets API leaves out trailing empty cells, so a column can be missing from a row. Every field
 * starts empty so the rest of the app can rely on them being strings.
 */
const emptyStop: RoadTripStop = {
  dayNumber: '',
  date: '',
  morningLocation: '',
  afternoonLocation: '',
  eveningLocation: '',
  time: '',
  distance: '',
};

/**
 * A row is only part of the trip when it says where the day starts, goes or ends, or has driving.
 * Day numbers, dates and formulas that give "0 km" can be filled in down the whole sheet ahead of
 * time, so they say nothing.
 */
function hasPlan(stop: RoadTripStop): boolean {
  const hasLocation = [stop.morningLocation, stop.afternoonLocation, stop.eveningLocation].some(
    (value) => value?.trim(),
  );

  return (
    hasLocation ||
    parseDistanceKm(stop.distance ?? '') > 0 ||
    parseDurationMinutes(stop.time ?? '') > 0
  );
}

/**
 * Make sure to convert the Google Sheet data to something we can use in the application. Empty rows
 * at the end of the sheet are left out, so they do not look like extra days.
 * @param data
 */
export function parseGoogleSheetData({ data }: Sheet): RoadTrip {
  const trip = data.map((row) =>
    Object.entries(row).reduce(
      (accumulator, [key, value]) => {
        const mappedKey = sheetColumnToRoadTripColumn[key];

        if (mappedKey) {
          accumulator[mappedKey] = String(value);
        }
        return accumulator;
      },
      { ...emptyStop },
    ),
  );

  const lastPlanned = trip.findLastIndex(hasPlan);

  return trip.slice(0, lastPlanned + 1);
}
