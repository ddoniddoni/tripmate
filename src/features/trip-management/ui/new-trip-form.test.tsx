// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createTrip: vi.fn() }));

vi.mock("@/features/trip-management/model/create-trip-action", () => ({
  createTrip: mocks.createTrip,
}));

import { NewTripForm } from "@/features/trip-management/ui/new-trip-form";

describe("NewTripForm", () => {
  it("shows a Korean date error when an empty start date loses focus", async () => {
    const user = userEvent.setup();

    render(<NewTripForm />);
    await user.click(screen.getByRole("button", { name: /새 여행 만들기/ }));

    const startDate = screen.getByLabelText("시작일");
    await user.click(startDate);
    await user.tab();

    expect(await screen.findByText("날짜를 입력해 주세요.")).toBeInTheDocument();
    expect(startDate).toHaveAttribute("aria-invalid", "true");
    expect(mocks.createTrip).not.toHaveBeenCalled();
  });

  it("hides the year-entry guide after both dates become valid", async () => {
    const user = userEvent.setup();

    render(<NewTripForm />);
    await user.click(screen.getByRole("button", { name: /새 여행 만들기/ }));

    const startDate = screen.getByLabelText("시작일");
    const endDate = screen.getByLabelText("종료일");

    fireEvent.change(startDate, {
      target: { value: "2026-08-15" },
    });
    fireEvent.change(endDate, {
      target: { value: "2026-08-20" },
    });

    expect(screen.queryAllByText("연도는 네 자리로 입력해 주세요.")).toHaveLength(0);
    expect(startDate).not.toHaveAttribute("aria-describedby");
    expect(endDate).not.toHaveAttribute("aria-describedby");
  });

  it("shows the year-entry guide only when a year has five or more digits", async () => {
    const user = userEvent.setup();

    render(<NewTripForm />);
    await user.click(screen.getByRole("button", { name: /새 여행 만들기/ }));

    const startDate = screen.getByLabelText("시작일");
    const endDate = screen.getByLabelText("종료일");

    expect(screen.queryAllByText("연도는 네 자리로 입력해 주세요.")).toHaveLength(0);

    fireEvent.change(startDate, {
      target: { value: "20260-08-15" },
    });

    expect(screen.getAllByText("연도는 네 자리로 입력해 주세요.")).toHaveLength(1);
    expect(startDate).toHaveAttribute("aria-describedby", "trip-start-date-help");
    expect(endDate).not.toHaveAttribute("aria-describedby");
  });
});
