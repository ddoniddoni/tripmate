import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  selectItemsForDay,
  selectOrderedDays,
  selectPlaceSuggestionsForDay,
} from "@/entities/itinerary/model/selectors";

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

  it("orders candidate places by vote count and then creation time", () => {
    const itinerary = structuredClone(jejuTrip.itinerary);
    const place = jejuTrip.itinerary.items["hamdeok-beach"].place;

    itinerary.placeSuggestions = {
      later: {
        comments: {},
        createdAt: "2026-01-20T11:00:00.000Z",
        createdBy: "user-minji",
        dayId: "jeju-day-1",
        id: "later",
        place,
        votes: { "user-minji": "2026-01-20T11:10:00.000Z" },
      },
      popular: {
        comments: {},
        createdAt: "2026-01-20T12:00:00.000Z",
        createdBy: "user-minji",
        dayId: "jeju-day-1",
        id: "popular",
        place,
        votes: {
          "user-jiwoo": "2026-01-20T12:10:00.000Z",
          "user-minji": "2026-01-20T12:11:00.000Z",
        },
      },
      earlier: {
        comments: {},
        createdAt: "2026-01-20T10:00:00.000Z",
        createdBy: "user-minji",
        dayId: "jeju-day-1",
        id: "earlier",
        place,
        votes: { "user-jiwoo": "2026-01-20T10:10:00.000Z" },
      },
    };

    expect(selectPlaceSuggestionsForDay(itinerary, "jeju-day-1").map(({ id }) => id)).toEqual([
      "popular",
      "earlier",
      "later",
    ]);
  });
});
