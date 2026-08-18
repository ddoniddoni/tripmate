// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
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
});
