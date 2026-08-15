// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leave: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  replace: vi.fn(),
  transfer: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));

vi.mock("@/features/trip-sharing/model/trip-member-actions", () => ({
  leaveTrip: mocks.leave,
  removeTripMember: mocks.remove,
  transferTripOwnership: mocks.transfer,
  updateTripMemberRole: mocks.updateRole,
}));

import { TripMembers } from "@/features/trip-sharing/ui/trip-members";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const ownerId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const memberId = "791fa61b-fd1e-4f09-a331-e0816e32728d";

function renderMembers() {
  return render(
    <TripMembers
      canManageMembers
      currentUserId={ownerId}
      members={[
        { displayName: "지우", role: "owner", userId: ownerId },
        { displayName: "민지", role: "editor", userId: memberId },
      ]}
      tripId={tripId}
    />,
  );
}

function resetMocks() {
  mocks.leave.mockReset();
  mocks.refresh.mockReset();
  mocks.remove.mockReset();
  mocks.replace.mockReset();
  mocks.transfer.mockReset();
  mocks.updateRole.mockReset();
}

describe("TripMembers", () => {
  it("shows the owner as self and makes only non-owner roles editable", () => {
    resetMocks();
    renderMembers();

    expect(screen.getByText("나 · 지우", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("민지", { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "나 · 지우 권한" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "민지 권한" })).toHaveValue("editor");
  });

  it("numbers companions independently from the database member order", () => {
    resetMocks();
    render(
      <TripMembers
        canManageMembers
        currentUserId={ownerId}
        members={[
          { displayName: null, role: "editor", userId: memberId },
          { displayName: "지우", role: "owner", userId: ownerId },
        ]}
        tripId={tripId}
      />,
    );

    expect(screen.getByRole("combobox", { name: "여행 멤버 1 권한" })).toBeInTheDocument();
  });

  it("changes a member role and refreshes the member list", async () => {
    resetMocks();
    mocks.updateRole.mockResolvedValue({ message: "멤버 권한을 변경했어요.", success: true });
    const user = userEvent.setup();
    renderMembers();

    await user.selectOptions(screen.getByRole("combobox", { name: "민지 권한" }), "viewer");

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

    await user.click(screen.getByRole("button", { name: "민지 제외" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("민지를 제외할까요?");
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

  it("requires confirmation before transferring ownership", async () => {
    resetMocks();
    mocks.transfer.mockResolvedValue({
      message: "여행 소유권을 넘겼어요. 이제 필요하면 여행에서 나갈 수 있습니다.",
      success: true,
    });
    const user = userEvent.setup();
    renderMembers();

    await user.click(screen.getByRole("button", { name: "민지에게 소유권 넘기기" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("민지에게 소유권을 넘길까요?");

    await user.click(screen.getByRole("button", { name: "소유권 넘기기" }));

    await waitFor(() => {
      expect(mocks.transfer).toHaveBeenCalledOnce();
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    const submittedFormData = mocks.transfer.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("memberId")).toBe(memberId);
    expect(submittedFormData.get("tripId")).toBe(tripId);
  });

  it("lets a non-owner leave without granting member-management controls", async () => {
    resetMocks();
    mocks.leave.mockResolvedValue({ message: "여행에서 나왔어요.", success: true });
    const user = userEvent.setup();
    render(
      <TripMembers
        canManageMembers={false}
        currentUserId={memberId}
        members={[
          { displayName: "지우", role: "owner", userId: ownerId },
          { displayName: "민지", role: "editor", userId: memberId },
        ]}
        tripId={tripId}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지우 제외" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "여행 나가기" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("이 여행에서 나갈까요?");

    await user.click(screen.getByRole("button", { name: "여행 나가기" }));

    await waitFor(() => {
      expect(mocks.leave).toHaveBeenCalledOnce();
      expect(mocks.replace).toHaveBeenCalledWith("/trips");
    });

    const submittedFormData = mocks.leave.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("tripId")).toBe(tripId);
    expect(submittedFormData.get("memberId")).toBeNull();
  });
});
