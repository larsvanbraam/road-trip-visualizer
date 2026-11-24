import type useGoogleSheets from 'use-google-sheets';
import { RoadTrip, RoadTripStop } from '../types/roadTrip.types';

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
 * Make sure to convert the Google Sheet data to something we can use in the application
 * @param data
 */
export function parseGoogleSheetData({ data }: Sheet): RoadTrip {
  return data.map((row) =>
    Object.entries(row).reduce((accumulator, [key, value]) => {
      const mappedKey = sheetColumnToRoadTripColumn[key];

      if (mappedKey) {
        accumulator[mappedKey] = String(value);
      }
      return accumulator;
    }, {} as RoadTripStop),
  );
}
