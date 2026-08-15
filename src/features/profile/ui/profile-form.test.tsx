// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), update: vi.fn() }));
const tripEditorPath = "/trips/d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8?view=itinerary";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/profile/model/update-profile-action", () => ({
  updateProfileDisplayName: mocks.update,
}));

import { ProfileForm } from "@/features/profile/ui/profile-form";

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a normalized nickname and returns to the trip list", async () => {
    mocks.update.mockResolvedValue({ message: "닉네임을 저장했어요.", status: "success" });
    const user = userEvent.setup();
    render(<ProfileForm initialDisplayName="" nextPath="/trips" />);

    await user.type(screen.getByLabelText("닉네임"), "  지우  ");
    await user.click(screen.getByRole("button", { name: "저장하고 여행 보기" }));

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledOnce();
      expect(mocks.replace).toHaveBeenCalledWith("/trips");
    });

    const submittedFormData = mocks.update.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("displayName")).toBe("지우");
  });

  it("returns to the requested trip workspace after profile setup", async () => {
    mocks.update.mockResolvedValue({ message: "닉네임을 저장했어요.", status: "success" });
    const user = userEvent.setup();
    render(<ProfileForm initialDisplayName="" nextPath={tripEditorPath} />);

    await user.type(screen.getByLabelText("닉네임"), "지우");
    await user.click(screen.getByRole("button", { name: "저장하고 여행 보기" }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(tripEditorPath);
    });
  });

  it("shows Korean validation instead of submitting an empty nickname", async () => {
    const user = userEvent.setup();
    render(<ProfileForm initialDisplayName="" nextPath="/trips" />);

    await user.click(screen.getByRole("button", { name: "저장하고 여행 보기" }));

    expect(await screen.findByText("닉네임을 입력해 주세요.")).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
