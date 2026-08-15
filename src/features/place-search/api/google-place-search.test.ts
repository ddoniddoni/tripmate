import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GooglePlaceSearchError,
  searchGooglePlaces,
} from "@/features/place-search/api/google-place-search";

const originalGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

describe("searchGooglePlaces", () => {
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

  it("requests only the fields needed to create a place snapshot", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            {
              displayName: { text: "성산일출봉" },
              formattedAddress: "제주특별자치도 서귀포시 성산읍 성산리 1",
              id: "ChIJ-test-place",
              location: { latitude: 33.4581, longitude: 126.9425 },
              primaryTypeDisplayName: { text: "관광 명소" },
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchGooglePlaces("성산일출봉")).resolves.toEqual([
      {
        address: "제주특별자치도 서귀포시 성산읍 성산리 1",
        category: "관광 명소",
        latitude: 33.4581,
        longitude: 126.9425,
        name: "성산일출봉",
        provider: "google",
        providerPlaceId: "ChIJ-test-place",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchText",
      expect.objectContaining({
        body: JSON.stringify({ languageCode: "ko", pageSize: 5, textQuery: "성산일출봉" }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "google-test-key",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
        },
        method: "POST",
      }),
    );
  });

  it("does not accept a missing API key", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    await expect(searchGooglePlaces("성산일출봉")).rejects.toEqual(
      expect.objectContaining<Partial<GooglePlaceSearchError>>({
        kind: "configuration",
        message: "장소 검색 설정이 아직 완료되지 않았습니다.",
      }),
    );
  });

  it("does not use malformed provider results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ places: [{ id: "missing-location" }] }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(searchGooglePlaces("성산일출봉")).resolves.toEqual([]);
  });
});
