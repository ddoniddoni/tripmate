// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/notifications/model/trip-invitation-notification-action-state", () => ({
  initialTripInvitationNotificationActionState: { message: "", status: "idle" },
}));
vi.mock("@/features/notifications/model/trip-invitation-notification-actions", () => ({
  respondToTripInvitation: vi.fn(),
}));

import { TripInvitationNotificationActions } from "@/features/notifications/ui/trip-invitation-notification-actions";

describe("TripInvitationNotificationActions", () => {
  it("submits an explicit acceptance or decline for one invitation", () => {
    render(
      <TripInvitationNotificationActions invitationId="791fa61b-fd1e-4f09-a331-e0816e32728d" />,
    );

    expect(screen.getByRole("button", { name: "거절" })).toHaveAttribute("name", "response");
    expect(screen.getByRole("button", { name: "거절" })).toHaveValue("declined");
    expect(screen.getByRole("button", { name: "수락" })).toHaveValue("accepted");
  });
});
