import {
  parseDirectionsQuery,
  parseDirectionsRoute,
  routeCoordinateSchema,
  type DirectionsQuery,
  type DirectionsRoute,
  type RouteCoordinate,
} from "@/features/map-sync/model/directions-adapter";
import { z } from "@/shared/lib/zod";

const googleComputeRoutesUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";
const googleComputeRoutesFieldMask = [
  "routes.duration",
  "routes.distanceMeters",
  "routes.polyline.encodedPolyline",
  "routes.legs.duration",
  "routes.legs.distanceMeters",
].join(",");

const googleRouteSchema = z.object({
  distanceMeters: z.number().finite().nonnegative(),
  duration: z.string().trim().min(1),
  legs: z
    .array(
      z.object({
        distanceMeters: z.number().finite().nonnegative(),
        duration: z.string().trim().min(1),
      }),
    )
    .min(1),
  polyline: z.object({ encodedPolyline: z.string().trim().min(1) }),
});

const googleComputeRoutesResponseSchema = z.object({
  routes: z.array(googleRouteSchema).min(1),
});

const googleErrorResponseSchema = z.object({
  error: z
    .object({
      message: z.string().trim().min(1).optional(),
      status: z.string().trim().min(1).optional(),
    })
    .optional(),
});

type GoogleRoutesErrorKind = "configuration" | "provider" | "response";

export class GoogleRoutesError extends Error {
  constructor(
    readonly kind: GoogleRoutesErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GoogleRoutesError";
  }
}

function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    throw new GoogleRoutesError(
      "configuration",
      "실제 이동 시간 설정이 아직 완료되지 않았습니다.",
    );
  }

  return apiKey;
}

function toGoogleWaypoint(coordinate: RouteCoordinate) {
  return {
    location: {
      latLng: {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      },
    },
  };
}

function parseGoogleDuration(duration: string) {
  const parsedDuration = /^(\d+(?:\.\d+)?)s$/.exec(duration);

  if (!parsedDuration?.[1]) {
    throw new GoogleRoutesError(
      "response",
      "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  const seconds = Number(parsedDuration[1]);

  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new GoogleRoutesError(
      "response",
      "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return Math.round(seconds);
}

function decodeEncodedPolyline(encodedPolyline: string): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encodedPolyline.length) {
    const latitudeResult = decodePolylineValue(encodedPolyline, index);
    latitude += latitudeResult.value;
    index = latitudeResult.nextIndex;

    const longitudeResult = decodePolylineValue(encodedPolyline, index);
    longitude += longitudeResult.value;
    index = longitudeResult.nextIndex;

    const coordinate = routeCoordinateSchema.safeParse({
      latitude: latitude / 100_000,
      longitude: longitude / 100_000,
    });

    if (!coordinate.success) {
      throw new GoogleRoutesError(
        "response",
        "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
      );
    }

    coordinates.push(coordinate.data);
  }

  if (coordinates.length < 2) {
    throw new GoogleRoutesError(
      "response",
      "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return coordinates;
}

function decodePolylineValue(encodedPolyline: string, startIndex: number) {
  let index = startIndex;
  let result = 0;
  let shift = 0;

  while (index < encodedPolyline.length) {
    const value = encodedPolyline.charCodeAt(index) - 63;
    index += 1;

    if (value < 0 || value > 63) {
      break;
    }

    result |= (value & 0x1f) << shift;
    shift += 5;

    if ((value & 0x20) === 0) {
      return {
        nextIndex: index,
        value: result & 1 ? ~(result >> 1) : result >> 1,
      };
    }
  }

  throw new GoogleRoutesError(
    "response",
    "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
  );
}

async function getProviderError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  const parsedPayload = googleErrorResponseSchema.safeParse(payload);
  const providerMessage = parsedPayload.success ? parsedPayload.data.error?.message ?? "" : "";
  const providerStatus = parsedPayload.success ? parsedPayload.data.error?.status ?? "" : "";
  const isDisabled =
    response.status === 403 &&
    (providerStatus === "PERMISSION_DENIED" || /not been used|disabled/i.test(providerMessage));

  return isDisabled
    ? new GoogleRoutesError(
        "configuration",
        "실제 이동 시간 설정이 필요합니다. Routes API를 활성화하고 서버 키 제한에 추가해 주세요.",
      )
    : new GoogleRoutesError(
        "provider",
        "이동 경로 서비스가 현재 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
}

function normalizeGoogleRoute(query: DirectionsQuery, payload: unknown): DirectionsRoute {
  const parsedResponse = googleComputeRoutesResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new GoogleRoutesError(
      "response",
      "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  const route = parsedResponse.data.routes[0];

  if (!route || route.legs.length !== query.coordinates.length - 1) {
    throw new GoogleRoutesError(
      "response",
      "이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return parseDirectionsRoute({
    coordinates: decodeEncodedPolyline(route.polyline.encodedPolyline),
    distanceMeters: Math.round(route.distanceMeters),
    durationSeconds: parseGoogleDuration(route.duration),
    legs: route.legs.map((leg) => ({
      distanceMeters: Math.round(leg.distanceMeters),
      durationSeconds: parseGoogleDuration(leg.duration),
    })),
  });
}

export async function getGoogleRoute(
  input: DirectionsQuery,
  options?: { signal?: AbortSignal },
): Promise<DirectionsRoute> {
  const query = parseDirectionsQuery(input);
  const origin = query.coordinates[0];
  const destination = query.coordinates.at(-1);

  if (!origin || !destination) {
    throw new GoogleRoutesError(
      "response",
      "이동 경로를 계산할 출발지와 도착지가 필요합니다.",
    );
  }

  let response: Response;

  try {
    response = await fetch(googleComputeRoutesUrl, {
      body: JSON.stringify({
        destination: toGoogleWaypoint(destination),
        intermediates: query.coordinates.slice(1, -1).map(toGoogleWaypoint),
        languageCode: "ko",
        origin: toGoogleWaypoint(origin),
        travelMode: "DRIVE",
        units: "METRIC",
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": getGoogleMapsApiKey(),
        "X-Goog-FieldMask": googleComputeRoutesFieldMask,
      },
      method: "POST",
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof GoogleRoutesError || isAbortError(error)) {
      throw error;
    }

    throw new GoogleRoutesError(
      "provider",
      "이동 경로 서비스에 연결하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  if (!response.ok) {
    throw await getProviderError(response);
  }

  const payload: unknown = await response.json().catch(() => null);

  return normalizeGoogleRoute(query, payload);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
