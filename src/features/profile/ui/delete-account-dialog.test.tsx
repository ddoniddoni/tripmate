// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ deleteAccount: vi.fn() }));

vi.mock("@/features/profile/model/delete-account-action", () => ({
  deleteAccount: mocks.deleteAccount,
}));

import { DeleteAccountDialog } from "@/features/profile/ui/delete-account-dialog";

describe("DeleteAccountDialog", () => {
  it("requires typing the withdrawal confirmation before enabling account deletion", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog />);

    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("TripMate 계정을 탈퇴할까요?");
    expect(screen.getByText(/소유한 여행이 있다면 먼저 소유권을 넘기거나/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "회원 탈퇴" })).toBeDisabled();

    await user.type(screen.getByLabelText(/계속하려면/), "삭제");
    expect(screen.getByRole("alert")).toHaveTextContent("입력한 내용이 일치하지 않아요.");

    await user.clear(screen.getByLabelText(/계속하려면/));
    await user.type(screen.getByLabelText(/계속하려면/), "탈퇴");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "회원 탈퇴" })).toBeEnabled();
  });
});
