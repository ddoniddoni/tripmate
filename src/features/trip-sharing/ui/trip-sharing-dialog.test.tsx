// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/trip-sharing/model/trip-invitation-actions", () => ({
  createTripInvitation: vi.fn(),
}));

vi.mock("@/features/trip-sharing/ui/pending-trip-invitations", () => ({
  PendingTripInvitations: () => <div>대기 중인 초대</div>,
}));

vi.mock("@/features/trip-sharing/ui/trip-members", () => ({
  TripMembers: ({ canManageMembers }: { canManageMembers: boolean }) => (
    <div data-can-manage-members={canManageMembers}>현재 멤버</div>
  ),
}));

import { TripSharingDialog } from "@/features/trip-sharing/ui/trip-sharing-dialog";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const ownerId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const memberId = "791fa61b-fd1e-4f09-a331-e0816e32728d";

describe("TripSharingDialog", () => {
  it("lets a non-owner open the member list without exposing invitation controls", async () => {
    const user = userEvent.setup();
    render(
      <TripSharingDialog
        canManageMembers={false}
        currentUserId={memberId}
        invitations={[]}
        memberCount={2}
        members={[
          { displayName: "지우", role: "owner", userId: ownerId },
          { displayName: "민지", role: "editor", userId: memberId },
        ]}
        tripId={tripId}
      />,
    );

    expect(screen.getByRole("button", { name: "멤버 2명" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "멤버 2명" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("함께 여행하는 멤버와 내 참여 상태를 확인할 수 있어요.");
    expect(screen.getByText("현재 멤버")).toHaveAttribute("data-can-manage-members", "false");
    expect(screen.queryByLabelText("초대할 이메일")).not.toBeInTheDocument();
  });
});
