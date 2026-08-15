// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { TripWorkspaceNavigation } from "@/features/collaboration/model/trip-workspace-navigation";
import { useTripWorkspaceNavigation } from "@/features/collaboration/model/use-trip-workspace-navigation";

const dayIds = ["day-one", "day-two"];

function NavigationHarness({ initialNavigation }: { initialNavigation: TripWorkspaceNavigation }) {
  const { navigation, selectDay, selectView } = useTripWorkspaceNavigation({
    dayIds,
    initialNavigation,
    pathname: "/trips/trip-123",
  });

  return (
    <>
      <output>{`${navigation.view}:${navigation.selectedDayId}`}</output>
      <button onClick={() => selectView("expenses")} type="button">
        경비
      </button>
      <button onClick={() => selectDay("day-two")} type="button">
        둘째 날
      </button>
    </>
  );
}

describe("useTripWorkspaceNavigation", () => {
  it("writes a shareable path and restores the browser history state", async () => {
    window.history.replaceState(null, "", "/trips/trip-123");
    const user = userEvent.setup();
    render(<NavigationHarness initialNavigation={{ selectedDayId: "day-one", view: "overview" }} />);

    await user.click(screen.getByRole("button", { name: "경비" }));
    await user.click(screen.getByRole("button", { name: "둘째 날" }));

    expect(window.location.search).toBe("?view=expenses&day=day-two");
    expect(screen.getByRole("status")).toHaveTextContent("expenses:day-two");

    act(() => {
      window.history.replaceState(null, "", "/trips/trip-123?view=itinerary&day=day-one");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByRole("status")).toHaveTextContent("itinerary:day-one");
  });
});
