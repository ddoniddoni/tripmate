// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateTripDetails: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/trip-management/model/update-trip-details-action", () => ({
  updateTripDetails: mocks.updateTripDetails,
}));

import { EditTripDetailsDialog } from "@/features/trip-management/ui/edit-trip-details-dialog";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

describe("EditTripDetailsDialog", () => {
  it("does not render a trip detail control for non-owners", () => {
    render(
      <EditTripDetailsDialog
        canUpdateTrip={false}
        destination="대한민국 · 부산"
        endDate="2026-10-12"
        startDate="2026-10-10"
        title="가을의 부산"
        tripId={tripId}
      />,
    );

    expect(screen.queryByRole("button", { name: "여행 정보 수정" })).not.toBeInTheDocument();
  });

  it("prefills the editable trip details for an owner", async () => {
    const user = userEvent.setup();
    render(
      <EditTripDetailsDialog
        canUpdateTrip
        destination="대한민국 · 부산"
        endDate="2026-10-12"
        startDate="2026-10-10"
        title="가을의 부산"
        tripId={tripId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "여행 정보 수정" }));

    const dialog = screen.getByRole("dialog", { name: "여행 정보와 기간을 바꿔요" });
    expect(within(dialog).getByLabelText("여행 이름")).toHaveValue("가을의 부산");
    expect(within(dialog).getByLabelText("여행지")).toHaveValue("대한민국 · 부산");
    expect(within(dialog).getByLabelText("시작일")).toHaveValue("2026-10-10");
    expect(within(dialog).getByLabelText("종료일")).toHaveValue("2026-10-12");
    expect(within(dialog).getByRole("button", { name: "저장하기" })).toBeInTheDocument();
  });
});
