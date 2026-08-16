import { describe, expect, it } from "vitest";

import { getItineraryTravelBuffers } from "@/entities/itinerary/model/schedule-travel-buffers";

describe("getItineraryTravelBuffers", () => {
  it("compares a route duration with the available time between adjacent schedules", () => {
    const buffers = getItineraryTravelBuffers(
      [
        { durationMinutes: 60, id: "breakfast", startTime: "09:00" },
        { durationMinutes: 90, id: "museum", startTime: "10:25" },
        { durationMinutes: 60, id: "park", startTime: "12:00" },
      ],
      [{ durationSeconds: 1_200 }, { durationSeconds: 2_100 }],
    );

    expect(buffers).toEqual([
      {
        availableMinutes: 25,
        itemIds: ["breakfast", "museum"],
        requiredMinutes: 20,
        status: "enough-time",
      },
      {
        availableMinutes: 5,
        itemIds: ["museum", "park"],
        requiredMinutes: 35,
        status: "not-enough-time",
      },
    ]);
  });

  it("skips incomplete and overlapping schedules", () => {
    expect(
      getItineraryTravelBuffers(
        [
          { durationMinutes: 60, id: "breakfast", startTime: "09:00" },
          { durationMinutes: 60, id: "overlap", startTime: "09:30" },
          { durationMinutes: undefined, id: "coffee", startTime: undefined },
          { durationMinutes: 60, id: "park", startTime: "25:00" },
        ],
        [{ durationSeconds: 300 }, { durationSeconds: 300 }, { durationSeconds: 300 }],
      ),
    ).toEqual([]);
  });
});
