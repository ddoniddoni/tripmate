// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { createTripOverview } from "@/features/trip-overview/model/trip-overview";
import { TripOverviewWorkspaceView } from "@/features/trip-overview/ui/trip-overview-workspace";

describe("TripOverviewWorkspaceView", () => {
  it("shows combined trip progress and opens the recommended workspace", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const overview = createTripOverview({
      expenses: [],
      itinerary: jejuTrip.itinerary,
      preparationItems: [],
    });

    render(
      <TripOverviewWorkspaceView
        onNavigate={onNavigate}
        overview={overview}
        trip={jejuTrip.trip}
      />,
    );

    expect(screen.getByRole("heading", { name: "봄의 제주" })).toBeInTheDocument();
    expect(screen.getByText("3곳")).toBeInTheDocument();
    expect(screen.getByText("출발 전, 함께 챙겨요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "준비하기 열기" }));

    expect(onNavigate).toHaveBeenCalledWith("preparation");
  });

  it("keeps direct workspace shortcuts available", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const overview = createTripOverview({
      expenses: [],
      itinerary: jejuTrip.itinerary,
      preparationItems: [],
    });

    render(
      <TripOverviewWorkspaceView
        onNavigate={onNavigate}
        overview={overview}
        trip={jejuTrip.trip}
      />,
    );

    await user.click(screen.getByRole("button", { name: "경비로 이동" }));

    expect(onNavigate).toHaveBeenCalledWith("expenses");
  });
});
