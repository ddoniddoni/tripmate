import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseUserProfile: vi.fn(),
  listNotifications: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/entities/trip/api/supabase-trip-notification-repository", () => ({
  listSupabaseTripInvitationNotifications: mocks.listNotifications,
}));
vi.mock("@/entities/user/api/supabase-profile-repository", () => ({
  getSupabaseUserProfile: mocks.getSupabaseUserProfile,
}));
vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("@/features/profile/ui/account-settings-dialog", () => ({
  AccountSettingsDialog: () => <button type="button">계정 설정</button>,
}));
vi.mock("@/features/notifications/ui/trip-invitation-notification-list", () => ({
  TripInvitationNotificationList: ({ notifications }: { notifications: unknown[] }) => (
    <div>알림 목록 {notifications.length}개</div>
  ),
}));

import NotificationsPage from "@/app/notifications/page";

const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "friend@example.com", id: userId });
    mocks.getSupabaseUserProfile.mockResolvedValue({ displayName: "친구", id: userId });
    mocks.listNotifications.mockResolvedValue([]);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("keeps the notifications path through authentication", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    await expect(NotificationsPage()).rejects.toThrow(
      `NEXT_REDIRECT:/login?next=${encodeURIComponent("/notifications")}`,
    );
  });

  it("shows the invitation inbox for a profiled user", async () => {
    const markup = renderToStaticMarkup(await NotificationsPage());

    expect(markup).toContain("알림 목록 0개");
    expect(markup).toContain("응답할 초대 0개");
  });
});
