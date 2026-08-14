import { z } from "zod";

const finiteNumber = z.number().finite();

const directionsTravelModeSchema = z.enum(["driving"]);

export const routeCoordinateSchema = z.object({
  longitude: finiteNumber.min(-180).max(180),
  latitude: finiteNumber.min(-90).max(90),
});

const directionsQuerySchema = z.object({
  travelMode: directionsTravelModeSchema,
  coordinates: z.array(routeCoordinateSchema).min(2),
});

const directionsRouteSchema = z.object({
  coordinates: z.array(routeCoordinateSchema).min(2),
  distanceMeters: finiteNumber.nonnegative(),
  durationSeconds: finiteNumber.nonnegative(),
});

export type DirectionsTravelMode = z.infer<typeof directionsTravelModeSchema>;
export type RouteCoordinate = z.infer<typeof routeCoordinateSchema>;
export type DirectionsQuery = z.infer<typeof directionsQuerySchema>;
export type DirectionsRoute = z.infer<typeof directionsRouteSchema>;

export function parseDirectionsQuery(input: unknown) {
  return directionsQuerySchema.parse(input);
}

export function parseDirectionsRoute(input: unknown) {
  return directionsRouteSchema.parse(input);
}

export type DirectionsAdapter = {
  getRoute: (
    query: DirectionsQuery,
    options?: { signal?: AbortSignal },
  ) => Promise<DirectionsRoute | null>;
};
