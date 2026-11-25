import type { RoadTripStop } from '../types/roadTrip.types';
import { isSheetError, parseDistanceKm, parseDurationMinutes } from './tripStats';

type FlightCandidate = Pick<RoadTripStop, 'morningLocation' | 'eveningLocation'> &
  Partial<Pick<RoadTripStop, 'distance' | 'time'>>;

const normalize = (value?: string) => (value ?? '').trim().toLowerCase();

/**
 * A day with driving: the sheet gives a distance or a drive time. Either can be missing when a
 * formula failed, so one of them is enough.
 */
export function isDrivingDay({ distance, time }: Partial<FlightCandidate>): boolean {
  return parseDistanceKm(distance ?? '') > 0 || parseDurationMinutes(time ?? '') > 0;
}

/**
 * The sheet could not calculate the distance of a day that goes from one place to another, for
 * example because a quota of its formulas was reached. Such a day can be a flight or a drive, so
 * it has to be looked up, see probeDay.
 */
export function needsRouteLookup({
  morningLocation,
  eveningLocation,
  distance,
  time,
}: FlightCandidate): boolean {
  const from = normalize(morningLocation);
  const to = normalize(eveningLocation);

  return (
    from !== '' &&
    to !== '' &&
    from !== to &&
    (isSheetError(distance) || isSheetError(time)) &&
    parseDistanceKm(distance ?? '') === 0 &&
    parseDurationMinutes(time ?? '') === 0
  );
}

/**
 * A flying day starts and ends in different places without any driving in between. The sheet has
 * no way to calculate a drive between those places, so it says "0 km" and no travel time.
 */
export function isFlightDay({
  morningLocation,
  eveningLocation,
  distance,
  time,
}: FlightCandidate): boolean {
  const from = normalize(morningLocation);
  const to = normalize(eveningLocation);

  // An error says nothing about the day, it is not "0 km"
  if (isSheetError(distance) || isSheetError(time)) return false;

  return (
    from !== '' &&
    to !== '' &&
    from !== to &&
    parseDistanceKm(distance ?? '') === 0 &&
    parseDurationMinutes(time ?? '') === 0
  );
}

type LatLng = google.maps.LatLngLiteral;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * The point halfway along the great circle between two places, where the plane of a flight is shown
 */
export function getGreatCircleMidpoint(from: LatLng, to: LatLng): LatLng {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const lng1 = toRadians(from.lng);
  const deltaLng = toRadians(to.lng - from.lng);

  const x = Math.cos(lat2) * Math.cos(deltaLng);
  const y = Math.cos(lat2) * Math.sin(deltaLng);

  const lat = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + x) ** 2 + y ** 2),
  );
  const lng = lng1 + Math.atan2(y, Math.cos(lat1) + x);

  // Keep the longitude between -180 and 180
  return { lat: toDegrees(lat), lng: ((toDegrees(lng) + 540) % 360) - 180 };
}

/**
 * The days that are part of the route of the whole trip. Days the sheet could not calculate are
 * assumed to be drives, so the whole trip takes one request. When that turns out not to be true
 * (isLookingUp), they are left out until each of them is known to be a drive or a flight.
 */
export function getTravelDays<T extends FlightCandidate>(days: Array<T>, isLookingUp: boolean) {
  if (!isLookingUp) return days.filter((day) => isDrivingDay(day) || needsRouteLookup(day));

  return days.some(needsRouteLookup) ? [] : days.filter(isDrivingDay);
}
