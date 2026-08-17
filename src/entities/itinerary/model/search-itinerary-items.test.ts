import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { searchItineraryItems } from "@/entities/itinerary/model/search-itinerary-items";

describe("searchItineraryItems", () => {
  it("returns the complete itinerary in day and item order for an empty query", () => {
    const results = searchItineraryItems(jejuTrip.itinerary, "  ");

    expect(results.map(({ item }) => item.id)).toEqual([
      "woojin-breakfast",
      "hamdeok-beach",
      "bijarim-forest",
    ]);
    expect(results.map(({ itemIndex }) => itemIndex)).toEqual([0, 1, 2]);
  });

  it("matches Korean place metadata and notes with normalized multi-word terms", () => {
    expect(
      searchItineraryItems(jejuTrip.itinerary, "  해장국   아침  ").map(
        ({ item }) => item.id,
      ),
    ).toEqual(["woojin-breakfast"]);
    expect(
      searchItineraryItems(jejuTrip.itinerary, "해수욕장").map(({ item }) => item.id),
    ).toEqual(["hamdeok-beach"]);
    expect(
      searchItineraryItems(jejuTrip.itinerary, "숲 신발").map(({ item }) => item.id),
    ).toEqual(["bijarim-forest"]);
  });

  it("returns no results when every search term cannot be matched", () => {
    expect(searchItineraryItems(jejuTrip.itinerary, "서울 야경")).toEqual([]);
  });

  it("ignores invalid item references instead of producing a broken result", () => {
    const itinerary = structuredClone(jejuTrip.itinerary);
    itinerary.days["jeju-day-1"].itemIds.push("missing-item");

    expect(searchItineraryItems(itinerary, "")).toHaveLength(3);
  });
});
