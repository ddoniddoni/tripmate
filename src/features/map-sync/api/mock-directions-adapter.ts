import type {
  DirectionsAdapter,
  DirectionsQuery,
  DirectionsRoute,
  RouteCoordinate,
} from "@/features/map-sync/model/directions-adapter";
import {
  parseDirectionsQuery,
  parseDirectionsRoute,
} from "@/features/map-sync/model/directions-adapter";

const earthRadiusMeters = 6_371_000;
const drivingMetersPerSecond = 9.7;

function abortDirections() {
  return new DOMException("경로 요청이 취소되었습니다.", "AbortError");
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getDistanceMeters(from: RouteCoordinate, to: RouteCoordinate) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function createRoute(query: DirectionsQuery): DirectionsRoute | null {
  const legs = query.coordinates.slice(1).flatMap((to, index) => {
    const from = query.coordinates[index];

    if (!from) {
      return [];
    }

    const distanceMeters = Math.round(getDistanceMeters(from, to));

    return distanceMeters > 0
      ? [
          {
            distanceMeters,
            durationSeconds: Math.max(60, Math.round(distanceMeters / drivingMetersPerSecond)),
          },
        ]
      : [];
  });

  const distanceMeters = legs.reduce((total, leg) => total + leg.distanceMeters, 0);

  if (distanceMeters === 0) {
    return null;
  }

  return parseDirectionsRoute({
    coordinates: query.coordinates,
    distanceMeters,
    durationSeconds: legs.reduce((total, leg) => total + leg.durationSeconds, 0),
    legs,
  });
}

export const mockDirectionsAdapter: DirectionsAdapter = {
  async getRoute(query, options) {
    if (options?.signal?.aborted) {
      throw abortDirections();
    }

    return createRoute(parseDirectionsQuery(query));
  },
};
