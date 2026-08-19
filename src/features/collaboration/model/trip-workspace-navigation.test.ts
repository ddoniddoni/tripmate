import { describe, expect, it } from "vitest";

import {
  getTripWorkspaceNavigation,
  getTripWorkspacePath,
} from "@/features/collaboration/model/trip-workspace-navigation";

const dayIds = ["day-one", "day-two", "day-three"];

describe("trip workspace navigation", () => {
  it("uses the requested workspace and day when both values are valid", () => {
    expect(
      getTripWorkspaceNavigation({ day: "day-two", view: "itinerary" }, dayIds),
    ).toEqual({ selectedDayId: "day-two", view: "itinerary" });
  });

  it("supports settings while preserving the selected day for returning to the itinerary", () => {
    expect(getTripWorkspaceNavigation({ day: "day-two", view: "settings" }, dayIds)).toEqual({
      selectedDayId: "day-two",
      view: "settings",
    });
  });

  it("falls back to the overview and first day for malformed or unavailable values", () => {
    expect(
      getTripWorkspaceNavigation({ day: "other-trip-day", view: "timeline" }, dayIds),
    ).toEqual({ selectedDayId: "day-one", view: "overview" });
  });

  it("keeps unrelated query values while serializing only meaningful navigation state", () => {
    expect(
      getTripWorkspacePath({
        dayIds,
        navigation: { selectedDayId: "day-two", view: "expenses" },
        pathname: "/trips/trip-123",
        search: "?source=invite",
      }),
    ).toBe("/trips/trip-123?source=invite&view=expenses&day=day-two");

    expect(
      getTripWorkspacePath({
        dayIds,
        navigation: { selectedDayId: "day-one", view: "overview" },
        pathname: "/trips/trip-123",
        search: "?source=invite&view=expenses&day=day-two",
      }),
    ).toBe("/trips/trip-123?source=invite");
  });
});
