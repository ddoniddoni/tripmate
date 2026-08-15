import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleRoutesError, getGoogleRoute } from "@/features/map-sync/api/google-routes";

const originalGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const query = {
  coordinates: [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 43.252, longitude: -126.453 },
  ],
  travelMode: "driving" as const,
};

describe("getGoogleRoute", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = "google-test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    if (originalGoogleMapsApiKey) {
      process.env.GOOGLE_MAPS_API_KEY = originalGoogleMapsApiKey;
      return;
    }

    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it("uses Compute Routes with the smallest field mask and no traffic options", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [
            {
              distanceMeters: 788_000,
              duration: "3600s",
              legs: [{ distanceMeters: 788_000, duration: "3600s" }],
              polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" },
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getGoogleRoute(query)).resolves.toMatchObject({
      distanceMeters: 788_000,
      durationSeconds: 3600,
      legs: [{ distanceMeters: 788_000, durationSeconds: 3600 }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      expect.objectContaining({
        body: JSON.stringify({
          destination: {
            location: { latLng: { latitude: 43.252, longitude: -126.453 } },
          },
          intermediates: [],
          languageCode: "ko",
          origin: {
            location: { latLng: { latitude: 38.5, longitude: -120.2 } },
          },
          travelMode: "DRIVE",
          units: "METRIC",
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "google-test-key",
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters",
        },
        method: "POST",
      }),
    );
  });

  it("reports disabled Routes API as a configuration issue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "Google Maps Platform API has not been used in project before or it is disabled.",
              status: "PERMISSION_DENIED",
            },
          }),
          { status: 403 },
        ),
      ),
    );

    await expect(getGoogleRoute(query)).rejects.toEqual(
      expect.objectContaining<Partial<GoogleRoutesError>>({
        kind: "configuration",
        message:
          "실제 이동 시간 설정이 필요합니다. Routes API를 활성화하고 서버 키 제한에 추가해 주세요.",
      }),
    );
  });

  it("does not accept a missing server key", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    await expect(getGoogleRoute(query)).rejects.toEqual(
      expect.objectContaining<Partial<GoogleRoutesError>>({
        kind: "configuration",
        message: "실제 이동 시간 설정이 아직 완료되지 않았습니다.",
      }),
    );
  });
});
