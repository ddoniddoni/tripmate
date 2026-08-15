import { afterEach, describe, expect, it, vi } from "vitest";

import { directionsApiAdapter } from "@/features/map-sync/api/directions-api-adapter";
import { DirectionsRequestError } from "@/features/map-sync/model/directions-adapter";

const query = {
  coordinates: [
    { latitude: 33.5115, longitude: 126.5201 },
    { latitude: 33.5431, longitude: 126.6692 },
  ],
  travelMode: "driving" as const,
};

const route = {
  coordinates: query.coordinates,
  distanceMeters: 16_000,
  durationSeconds: 1_900,
  legs: [{ distanceMeters: 16_000, durationSeconds: 1_900 }],
};

describe("directionsApiAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the authenticated server route adapter and normalizes its response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ route }), { headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(directionsApiAdapter.getRoute(query)).resolves.toEqual(route);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/directions",
      expect.objectContaining({
        body: JSON.stringify(query),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });

  it("keeps a Korean server error message for the route preview", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "오늘 실제 이동 경로 계산 한도에 도달했어요." }), {
          status: 429,
        }),
      ),
    );

    await expect(directionsApiAdapter.getRoute(query)).rejects.toEqual(
      expect.objectContaining<Partial<DirectionsRequestError>>({
        message: "오늘 실제 이동 경로 계산 한도에 도달했어요.",
      }),
    );
  });
});
