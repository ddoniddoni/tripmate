// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/notifications/ui/trip-invitation-notification-actions", () => ({
  TripInvitationNotificationActions: () => (
    <div>
      <button type="button">거절</button>
      <button type="button">수락</button>
    </div>
  ),
}));

import { TripInvitationNotificationList } from "@/features/notifications/ui/trip-invitation-notification-list";

const notification = {
  createdAt: "2026-08-22T00:00:00.000Z",
  expiresAt: "2026-08-29T00:00:00.000Z",
  id: "791fa61b-fd1e-4f09-a331-e0816e32728d",
  role: "editor" as const,
  status: "pending" as const,
  trip: {
    destination: "제주",
    endDate: "2026-09-02",
    id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
    startDate: "2026-08-30",
    timeZone: "Asia/Seoul",
    title: "제주 여행",
  },
};

describe("TripInvitationNotificationList", () => {
  it("shows accept and decline controls for an active invitation", () => {
    render(
      <TripInvitationNotificationList
        notifications={[notification]}
        now={new Date("2026-08-23T00:00:00.000Z")}
      />,
    );

    expect(screen.getByRole("heading", { name: "제주 여행에 초대받았어요" })).toBeInTheDocument();
    expect(screen.getAllByText("편집자")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "거절" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수락" })).toBeInTheDocument();
  });

  it("shows accepted invitations as history with a trip link", () => {
    render(
      <TripInvitationNotificationList
        notifications={[{ ...notification, status: "accepted" }]}
        now={new Date("2026-08-23T00:00:00.000Z")}
      />,
    );

    expect(screen.getByText("수락한 초대")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "여행 열기" })).toHaveAttribute(
      "href",
      `/trips/${notification.trip.id}`,
    );
    expect(screen.queryByRole("button", { name: "수락" })).not.toBeInTheDocument();
  });

  it("turns an empty inbox into a clear next step", () => {
    render(<TripInvitationNotificationList notifications={[]} />);

    expect(screen.getByRole("heading", { name: "새로운 알림이 없어요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 여행으로 돌아가기" })).toHaveAttribute(
      "href",
      "/trips",
    );
  });
});
