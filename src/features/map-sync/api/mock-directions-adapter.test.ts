import { describe, expect, it } from "vitest";

import { mockDirectionsAdapter } from "@/features/map-sync/api/mock-directions-adapter";

const query = {
  travelMode: "driving" as const,
  coordinates: [
    { longitude: 126.5201, latitude: 33.5115 },
    { longitude: 126.6692, latitude: 33.5431 },
  ],
};

describe("mockDirectionsAdapter", () => {
  it("calculates a deterministic driving route from ordered coordinates", async () => {
    await expect(mockDirectionsAdapter.getRoute(query)).resolves.toMatchObject({
      coordinates: query.coordinates,
      distanceMeters: expect.any(Number),
      durationSeconds: expect.any(Number),
    });
  });

  it("returns no route for identical coordinates", async () => {
    await expect(
      mockDirectionsAdapter.getRoute({
        travelMode: "driving",
        coordinates: [
          { longitude: 126.5201, latitude: 33.5115 },
          { longitude: 126.5201, latitude: 33.5115 },
        ],
      }),
    ).resolves.toBeNull();
  });

  it("honors cancellation before the provider is called", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(mockDirectionsAdapter.getRoute(query, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
