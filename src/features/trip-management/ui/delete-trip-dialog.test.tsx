// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteTrip: vi.fn(),
}));

vi.mock("@/features/trip-management/model/delete-trip-action", () => ({
  deleteTrip: mocks.deleteTrip,
}));

import { DeleteTripDialog } from "@/features/trip-management/ui/delete-trip-dialog";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

describe("DeleteTripDialog", () => {
  it("does not render a destructive control for non-owners", () => {
    render(<DeleteTripDialog canDeleteTrip={false} tripId={tripId} tripTitle="가을의 부산" />);

    expect(screen.queryByRole("button", { name: "여행 삭제" })).not.toBeInTheDocument();
  });

  it("requires explicit confirmation before deletion", async () => {
    const user = userEvent.setup();
    render(<DeleteTripDialog canDeleteTrip tripId={tripId} tripTitle="가을의 부산" />);

    await user.click(screen.getByRole("button", { name: "여행 삭제" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("가을의 부산을 삭제할까요?");
    expect(screen.getByText("되돌릴 수 없는 작업")).toBeInTheDocument();
    expect(screen.getByText(/초대와 멤버 정보가 함께 삭제되고/)).toBeInTheDocument();
    expect(screen.getByLabelText(/삭제하려면 여행 이름/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여행 삭제" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("enables deletion only after the matching trip title is entered", async () => {
    const user = userEvent.setup();
    render(<DeleteTripDialog canDeleteTrip tripId={tripId} tripTitle="가을의 부산" />);

    await user.click(screen.getByRole("button", { name: "여행 삭제" }));
    await user.type(screen.getByLabelText(/삭제하려면 여행 이름/), "다른 여행");

    expect(screen.getByRole("alert")).toHaveTextContent("여행 이름이 일치하지 않아요.");
    expect(screen.getByRole("button", { name: "여행 삭제" })).toBeDisabled();

    await user.clear(screen.getByLabelText(/삭제하려면 여행 이름/));
    await user.type(screen.getByLabelText(/삭제하려면 여행 이름/), "가을의 부산");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여행 삭제" })).toBeEnabled();
  });
});
