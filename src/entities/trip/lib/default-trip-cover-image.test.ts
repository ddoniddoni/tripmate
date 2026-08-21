import { describe, expect, it } from "vitest";

import {
  defaultTripCoverImagePaths,
  getDefaultTripCoverImageUrl,
} from "@/entities/trip/lib/default-trip-cover-image";

describe("getDefaultTripCoverImageUrl", () => {
  it("uses the five bundled travel covers", () => {
    expect(defaultTripCoverImagePaths).toEqual([
      "/trip-covers/default/cover-1.jpg",
      "/trip-covers/default/cover-2.jpg",
      "/trip-covers/default/cover-3.jpg",
      "/trip-covers/default/cover-4.jpg",
      "/trip-covers/default/cover-5.jpg",
    ]);
  });

  it("keeps a trip's default cover stable across renders", () => {
    const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

    expect(getDefaultTripCoverImageUrl(tripId)).toBe(getDefaultTripCoverImageUrl(tripId));
    expect(defaultTripCoverImagePaths).toContain(getDefaultTripCoverImageUrl(tripId));
  });
});
