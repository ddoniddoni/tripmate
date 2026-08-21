// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { ItineraryEditorShell } from "@/features/itinerary-editor/ui/itinerary-editor-shell";

describe("ItineraryEditorShell", () => {
  it("provides a skip link to the trip workspace", () => {
    render(
      <ItineraryEditorShell itineraryEditor={<p>여행 작업 공간</p>} tripItinerary={jejuTrip} />,
    );

    expect(screen.getByRole("link", { name: "일정 내용으로 건너뛰기" })).toHaveAttribute(
      "href",
      "#trip-workspace-content",
    );
    expect(screen.getByRole("region", { name: "여행 작업 공간" })).toHaveAttribute(
      "id",
      "trip-workspace-content",
    );
  });

  it("places the theme toggle in the editor header", () => {
    render(
      <ItineraryEditorShell itineraryEditor={<p>여행 작업 공간</p>} tripItinerary={jejuTrip} />,
    );

    expect(screen.getByRole("button", { name: "다크 모드로 전환" })).toBeInTheDocument();
  });
});
