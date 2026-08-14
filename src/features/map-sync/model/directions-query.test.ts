import { describe, expect, it } from "vitest";

import {
  buildDirectionsQuery,
  buildDirectionsQueryFromInputSignature,
  getDirectionsInputSignature,
  getDirectionsQueryKey,
} from "@/features/map-sync/model/directions-query";

describe("buildDirectionsQuery", () => {
  it("distinguishes empty, one-point, and missing-coordinate states", () => {
    expect(buildDirectionsQuery([])).toEqual({ status: "empty" });
    expect(buildDirectionsQuery([{ longitude: 126.5, latitude: 33.5 }])).toMatchObject({
      status: "one-point",
    });
    expect(buildDirectionsQuery([{ longitude: 126.5 }, { longitude: 126.6, latitude: 33.6 }])).toEqual({
      status: "missing-points",
      missingPointCount: 1,
    });
  });

  it("creates a stable key from mode and committed coordinate order", () => {
    const first = buildDirectionsQuery([
      { longitude: 126.5201, latitude: 33.5115 },
      { longitude: 126.6692, latitude: 33.5431 },
    ]);
    const reordered = buildDirectionsQuery([
      { longitude: 126.6692, latitude: 33.5431 },
      { longitude: 126.5201, latitude: 33.5115 },
    ]);

    if (first.status !== "ready" || reordered.status !== "ready") {
      throw new Error("Expected valid directions queries.");
    }

    expect(getDirectionsQueryKey(first.query)).toBe(
      "directions:driving:126.520100,33.511500:126.669200,33.543100",
    );
    expect(getDirectionsQueryKey(reordered.query)).not.toBe(getDirectionsQueryKey(first.query));
  });

  it("round-trips a route input signature without masking missing coordinates", () => {
    const signature = getDirectionsInputSignature([
      { longitude: 126.5201, latitude: 33.5115 },
      { longitude: undefined, latitude: 33.5431 },
    ]);

    expect(signature).toBe("126.5201,33.5115|missing,33.5431");
    expect(buildDirectionsQueryFromInputSignature(signature)).toEqual({
      status: "missing-points",
      missingPointCount: 1,
    });
  });
});
