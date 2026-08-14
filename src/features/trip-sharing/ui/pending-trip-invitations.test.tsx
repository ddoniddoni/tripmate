// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/trip-sharing/model/trip-invitation-actions", () => ({
  revokeTripInvitation: mocks.revoke,
}));

import { PendingTripInvitations } from "@/features/trip-sharing/ui/pending-trip-invitations";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const invitationId = "791fa61b-fd1e-4f09-a331-e0816e32728d";

function resetMocks() {
  mocks.refresh.mockReset();
  mocks.revoke.mockReset();
}

describe("PendingTripInvitations", () => {
  it("shows an empty pending invitation state", () => {
    resetMocks();
    render(<PendingTripInvitations invitations={[]} tripId={tripId} />);

    expect(screen.getByText("현재 대기 중인 초대가 없어요.")).toBeInTheDocument();
  });

  it("shows invitation role and marks expired invitations", () => {
    resetMocks();
    render(
      <PendingTripInvitations
        invitations={[
          {
            email: "friend@example.com",
            expiresAt: "2020-01-01T00:00:00.000Z",
            id: invitationId,
            role: "editor",
          },
        ]}
        tripId={tripId}
      />,
    );

    expect(screen.getByText("friend@example.com")).toBeInTheDocument();
    expect(screen.getByText("편집자 · 만료됨")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("revokes an invitation then refreshes the server data", async () => {
    resetMocks();
    mocks.revoke.mockResolvedValue({ message: "대기 중인 초대를 취소했습니다.", success: true });
    const user = userEvent.setup();
    render(
      <PendingTripInvitations
        invitations={[
          {
            email: "friend@example.com",
            expiresAt: "2099-01-01T00:00:00.000Z",
            id: invitationId,
            role: "viewer",
          },
        ]}
        tripId={tripId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "초대 취소" }));

    await waitFor(() => {
      expect(mocks.revoke).toHaveBeenCalledOnce();
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });
    const submittedFormData = mocks.revoke.mock.calls[0]?.[0] as FormData;

    expect(submittedFormData.get("invitationId")).toBe(invitationId);
    expect(submittedFormData.get("tripId")).toBe(tripId);
    expect(screen.getByRole("status")).toHaveTextContent("대기 중인 초대를 취소했습니다.");
  });
});
