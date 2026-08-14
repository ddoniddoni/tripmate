import type { RouteCoordinate } from "@/features/map-sync/model/directions-adapter";

export type MapPoint = {
  x: number;
  y: number;
};

type MapProjection = (coordinate: RouteCoordinate) => MapPoint;

const mapPadding = 12;
const minCoordinateSpan = 0.02;

function getRange(minimum: number, maximum: number) {
  return Math.max(maximum - minimum, minCoordinateSpan);
}

export function createMapProjection(
  coordinates: readonly RouteCoordinate[],
): MapProjection | null {
  if (coordinates.length === 0) {
    return null;
  }

  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudeRange = getRange(Math.min(...longitudes), Math.max(...longitudes));
  const latitudeRange = getRange(Math.min(...latitudes), Math.max(...latitudes));
  const longitudeCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const latitudeCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const minimumLongitude = longitudeCenter - longitudeRange / 2;
  const maximumLatitude = latitudeCenter + latitudeRange / 2;
  const drawableArea = 100 - mapPadding * 2;

  return (coordinate) => ({
    x: mapPadding + ((coordinate.longitude - minimumLongitude) / longitudeRange) * drawableArea,
    y: mapPadding + ((maximumLatitude - coordinate.latitude) / latitudeRange) * drawableArea,
  });
}

export function getSvgPolylinePoints(
  coordinates: readonly RouteCoordinate[],
  project: MapProjection | null,
) {
  if (!project || coordinates.length < 2) {
    return null;
  }

  return coordinates
    .map((coordinate) => {
      const point = project(coordinate);
      return `${(point.x * 7.2).toFixed(1)},${(point.y * 7.2).toFixed(1)}`;
    })
    .join(" ");
}
