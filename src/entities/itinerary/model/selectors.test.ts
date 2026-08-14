import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { selectItemsForDay, selectOrderedDays } from "@/entities/itinerary/model/selectors";

describe("itinerary selectors", () => {
  it("returns days in canonical dayOrder", () => {
    const reordered = structuredClone(jejuTrip.itinerary);
    reordered.dayOrder = ["jeju-day-3", "jeju-day-1", "jeju-day-4", "jeju-day-2"];

    expect(selectOrderedDays(reordered).map((day) => day.id)).toEqual(reordered.dayOrder);
  });

  it("returns items in the order stored by the selected day", () => {
    expect(selectItemsForDay(jejuTrip.itinerary, "jeju-day-1").map((item) => item.id)).toEqual([
      "woojin-breakfast",
      "hamdeok-beach",
      "bijarim-forest",
    ]);
  });

  it("returns an empty list for an unknown day", () => {
    expect(selectItemsForDay(jejuTrip.itinerary, "missing-day")).toEqual([]);
  });
});
