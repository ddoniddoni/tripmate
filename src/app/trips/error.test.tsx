// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

import TripsError from "@/app/trips/error";

describe("TripsError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gives a person a way back to their trip list instead of retrying the failed route", async () => {
    const user = userEvent.setup();
    render(<TripsError />);

    expect(screen.queryByRole("button", { name: "다시 시도하기" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "내 여행으로 가기" }));

    expect(mocks.replace).toHaveBeenCalledWith("/trips");
  });
});
