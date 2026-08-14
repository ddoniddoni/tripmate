import { describe, expect, it } from "vitest";

import { createEmptyTripItinerary } from "@/entities/itinerary/lib/create-empty-trip-itinerary";

describe("createEmptyTripItinerary", () => {
  it("creates one empty day for every calendar day in the trip", () => {
    const itinerary = createEmptyTripItinerary({
      destination: "대한민국 · 부산",
      endDate: "2026-10-12",
      id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
      startDate: "2026-10-10",
      timeZone: "Asia/Seoul",
      title: "가을의 부산",
    });

    expect(itinerary.itinerary.dayOrder).toHaveLength(3);
    expect(itinerary.itinerary.dayOrder).toEqual([
      "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8-day-1",
      "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8-day-2",
      "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8-day-3",
    ]);
    expect(itinerary.itinerary.days["d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8-day-2"]?.date).toBe(
      "2026-10-11",
    );
    expect(itinerary.itinerary.items).toEqual({});
  });
});
