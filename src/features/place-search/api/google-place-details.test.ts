import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getGooglePlaceDetails,
  GooglePlaceDetailsError,
} from "@/features/place-search/api/google-place-details";

const originalGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

describe("getGooglePlaceDetails", () => {
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

  it("requests only rating and regular opening hours", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          rating: 4.6,
          regularOpeningHours: {
            weekdayDescriptions: ["월요일: 오전 9:00 ~ 오후 6:00"],
          },
          userRatingCount: 321,
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getGooglePlaceDetails("ChIJ-test-place")).resolves.toEqual({
      rating: 4.6,
      regularOpeningHours: ["월요일: 오전 9:00 ~ 오후 6:00"],
      userRatingCount: 321,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJ-test-place",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          "X-Goog-Api-Key": "google-test-key",
          "X-Goog-FieldMask": "rating,userRatingCount,regularOpeningHours",
        },
      }),
    );
  });

  it("does not accept a missing API key", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    await expect(getGooglePlaceDetails("ChIJ-test-place")).rejects.toEqual(
      expect.objectContaining<Partial<GooglePlaceDetailsError>>({
        kind: "configuration",
        message: "장소 상세 정보 설정이 아직 완료되지 않았습니다.",
      }),
    );
  });

  it("rejects malformed provider details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ rating: "not-a-rating" }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(getGooglePlaceDetails("ChIJ-test-place")).rejects.toEqual(
      expect.objectContaining<Partial<GooglePlaceDetailsError>>({ kind: "response" }),
    );
  });
});
