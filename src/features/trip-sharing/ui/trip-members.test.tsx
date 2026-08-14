// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  remove: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/trip-sharing/model/trip-member-actions", () => ({
  removeTripMember: mocks.remove,
  updateTripMemberRole: mocks.updateRole,
}));

import { TripMembers } from "@/features/trip-sharing/ui/trip-members";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const ownerId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const memberId = "791fa61b-fd1e-4f09-a331-e0816e32728d";

function renderMembers() {
  return render(
    <TripMembers
      currentUserId={ownerId}
      members={[
        { role: "owner", userId: ownerId },
        { role: "editor", userId: memberId },
      ]}
      tripId={tripId}
    />,
  );
}

function resetMocks() {
  mocks.refresh.mockReset();
  mocks.remove.mockReset();
  mocks.updateRole.mockReset();
}

describe("TripMembers", () => {
  it("shows the owner as self and makes only non-owner roles editable", () => {
    resetMocks();
    renderMembers();

    expect(screen.getByText("나", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("동행인 1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "나 권한" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "동행인 1 권한" })).toHaveValue("editor");
  });

  it("numbers companions independently from the database member order", () => {
    resetMocks();
    render(
      <TripMembers
        currentUserId={ownerId}
        members={[
          { role: "editor", userId: memberId },
          { role: "owner", userId: ownerId },
        ]}
        tripId={tripId}
      />,
    );

    expect(screen.getByRole("combobox", { name: "동행인 1 권한" })).toBeInTheDocument();
  });

  it("changes a member role and refreshes the member list", async () => {
    resetMocks();
    mocks.updateRole.mockResolvedValue({ message: "멤버 권한을 변경했어요.", success: true });
    const user = userEvent.setup();
    renderMembers();

    await user.selectOptions(screen.getByRole("combobox", { name: "동행인 1 권한" }), "viewer");

    await waitFor(() => {
      expect(mocks.updateRole).toHaveBeenCalledOnce();
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    const submittedFormData = mocks.updateRole.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("memberId")).toBe(memberId);
    expect(submittedFormData.get("role")).toBe("viewer");
    expect(submittedFormData.get("tripId")).toBe(tripId);
    expect(screen.getByRole("status")).toHaveTextContent("멤버 권한을 변경했어요.");
  });

  it("requires confirmation before removing a member", async () => {
    resetMocks();
    mocks.remove.mockResolvedValue({ message: "멤버를 여행에서 제외했어요.", success: true });
    const user = userEvent.setup();
    renderMembers();

    await user.click(screen.getByRole("button", { name: "동행인 1 제외" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("동행인 1을 제외할까요?");
    expect(screen.getByText(/이 작업은 되돌릴 수 없습니다/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "제외하기" }));

    await waitFor(() => {
      expect(mocks.remove).toHaveBeenCalledOnce();
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    const submittedFormData = mocks.remove.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("memberId")).toBe(memberId);
    expect(submittedFormData.get("tripId")).toBe(tripId);
  });
});
