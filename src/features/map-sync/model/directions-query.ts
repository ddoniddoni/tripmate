import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import type {
  DirectionsQuery,
  DirectionsTravelMode,
  RouteCoordinate,
} from "@/features/map-sync/model/directions-adapter";
import {
  maxDirectionsCoordinateCount,
  routeCoordinateSchema,
} from "@/features/map-sync/model/directions-adapter";

type RoutePointInput = Partial<Pick<PlaceSnapshot, "latitude" | "longitude">>;

export type DirectionsQueryBuildResult =
  | { status: "empty" }
  | { status: "missing-points"; missingPointCount: number }
  | { status: "one-point"; coordinate: RouteCoordinate }
  | { status: "too-many-points"; maximumCoordinateCount: number }
  | { status: "ready"; query: DirectionsQuery };

function normalizeCoordinate(point: RoutePointInput): RouteCoordinate | null {
  const result = routeCoordinateSchema.safeParse(point);

  return result.success ? result.data : null;
}

function formatInputCoordinate(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toString() : "missing";
}

function parseInputCoordinate(value: string | undefined) {
  if (!value || value === "missing") {
    return undefined;
  }

  return Number(value);
}

export function getDirectionsInputSignature(points: readonly RoutePointInput[]) {
  return points
    .map(
      (point) =>
        `${formatInputCoordinate(point.longitude)},${formatInputCoordinate(point.latitude)}`,
    )
    .join("|");
}

export function buildDirectionsQueryFromInputSignature(
  signature: string,
  travelMode: DirectionsTravelMode = "driving",
): DirectionsQueryBuildResult {
  if (!signature) {
    return { status: "empty" };
  }

  return buildDirectionsQuery(
    signature.split("|").map((encodedPoint) => {
      const [longitude, latitude] = encodedPoint.split(",");

      return {
        longitude: parseInputCoordinate(longitude),
        latitude: parseInputCoordinate(latitude),
      };
    }),
    travelMode,
  );
}

export function buildDirectionsQuery(
  points: readonly RoutePointInput[],
  travelMode: DirectionsTravelMode = "driving",
): DirectionsQueryBuildResult {
  if (points.length === 0) {
    return { status: "empty" };
  }

  const coordinates = points.map(normalizeCoordinate);
  const missingPointCount = coordinates.filter((coordinate) => coordinate === null).length;

  if (missingPointCount > 0) {
    return { status: "missing-points", missingPointCount };
  }

  const validCoordinates = coordinates.filter(
    (coordinate): coordinate is RouteCoordinate => coordinate !== null,
  );

  if (validCoordinates.length === 1) {
    return { status: "one-point", coordinate: validCoordinates[0] };
  }

  if (validCoordinates.length > maxDirectionsCoordinateCount) {
    return {
      status: "too-many-points",
      maximumCoordinateCount: maxDirectionsCoordinateCount,
    };
  }

  return {
    status: "ready",
    query: { coordinates: validCoordinates, travelMode },
  };
}

function formatCoordinateForCache(coordinate: RouteCoordinate) {
  return `${coordinate.longitude.toFixed(6)},${coordinate.latitude.toFixed(6)}`;
}

export function getDirectionsQueryKey(query: DirectionsQuery) {
  return [
    "directions",
    query.travelMode,
    ...query.coordinates.map(formatCoordinateForCache),
  ].join(":");
}
