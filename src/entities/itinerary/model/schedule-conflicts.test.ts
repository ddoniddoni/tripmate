import { describe, expect, it } from "vitest";

import { getItineraryScheduleConflicts } from "@/entities/itinerary/model/schedule-conflicts";

describe("getItineraryScheduleConflicts", () => {
  it("finds every overlapping pair regardless of the itinerary order", () => {
    const conflicts = getItineraryScheduleConflicts([
      { durationMinutes: 60, id: "afternoon", startTime: "12:30" },
      { durationMinutes: 90, id: "morning", startTime: "10:00" },
      { durationMinutes: 120, id: "brunch", startTime: "11:00" },
    ]);

    expect(conflicts).toEqual([
      { itemIds: ["afternoon", "brunch"] },
      { itemIds: ["morning", "brunch"] },
    ]);
  });

  it("does not flag adjacent or incomplete schedules", () => {
    expect(
      getItineraryScheduleConflicts([
        { durationMinutes: 60, id: "breakfast", startTime: "09:00" },
        { durationMinutes: 30, id: "museum", startTime: "10:00" },
        { durationMinutes: undefined, id: "coffee", startTime: "10:15" },
        { durationMinutes: 60, id: "walk", startTime: undefined },
      ]),
    ).toEqual([]);
  });

  it("ignores malformed schedule values at the rendering boundary", () => {
    expect(
      getItineraryScheduleConflicts([
        { durationMinutes: 60, id: "invalid-time", startTime: "25:00" },
        { durationMinutes: 0, id: "invalid-duration", startTime: "10:00" },
        { durationMinutes: 90, id: "valid", startTime: "10:30" },
      ]),
    ).toEqual([]);
  });
});
