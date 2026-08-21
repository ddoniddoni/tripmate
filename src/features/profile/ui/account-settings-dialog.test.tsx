// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/features/profile/model/update-profile-action", () => ({
  updateProfileDisplayName: vi.fn(),
}));
vi.mock("@/features/profile/model/delete-account-action", () => ({ deleteAccount: vi.fn() }));

import { AccountSettingsDialog } from "@/features/profile/ui/account-settings-dialog";

describe("AccountSettingsDialog", () => {
  it("opens account-level nickname and withdrawal controls from the profile avatar", async () => {
    const user = userEvent.setup();
    render(<AccountSettingsDialog displayName="하하하" email="traveler@example.com" />);

    await user.click(screen.getByRole("button", { name: "계정 설정 열기" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("내 프로필");
    expect(screen.getByText("traveler@example.com")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "닉네임" })).toHaveValue("하하하");
    expect(screen.getByRole("button", { name: "닉네임 저장" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("TripMate 계정을 탈퇴할까요?");
  });
});
