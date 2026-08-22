import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listSupabaseTripInvitationNotifications } from "@/entities/trip/api/supabase-trip-notification-repository";
import { isTripInvitationNotificationActionable } from "@/entities/trip/model/trip-invitation";
import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { NotificationLink } from "@/features/notifications/ui/notification-link";
import { TripInvitationNotificationList } from "@/features/notifications/ui/trip-invitation-notification-list";
import { AccountSettingsDialog } from "@/features/profile/ui/account-settings-dialog";
import { BrandMark } from "@/shared/ui/brand-mark";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "알림",
};

export default async function NotificationsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/notifications")}`);
  }

  const [profileResult, notificationsResult] = await Promise.allSettled([
    getSupabaseUserProfile(user.id),
    listSupabaseTripInvitationNotifications(user.id),
  ]);

  if (profileResult.status === "rejected") {
    throw profileResult.reason;
  }

  const profile = profileResult.value;

  if (!profile?.displayName) {
    redirect(`/profile?next=${encodeURIComponent("/notifications")}`);
  }

  if (notificationsResult.status === "rejected") {
    throw notificationsResult.reason;
  }

  const notifications = notificationsResult.value;
  const now = new Date();
  const pendingCount = notifications.filter((notification) =>
    isTripInvitationNotificationActionable(notification, now),
  ).length;

  return (
    <main className="notifications-page">
      <header className="trips-header">
        <Link className="brand-link" href="/trips" aria-label="여행 목록으로 이동">
          <BrandMark />
        </Link>
        <div className="account-actions">
          <NotificationLink active pendingCount={pendingCount} />
          <ThemeToggle />
          <AccountSettingsDialog displayName={profile.displayName} email={user.email} />
          <SignOutButton />
        </div>
      </header>

      <section className="notifications-content" aria-labelledby="notifications-heading">
        <div className="notifications-title-row">
          <div>
            <span className="eyebrow">여행 소식</span>
            <h1 id="notifications-heading">알림</h1>
            <p>여행 초대를 확인하고 함께할지 바로 결정할 수 있어요.</p>
          </div>
          <span className="notifications-pending-count">응답할 초대 {pendingCount}개</span>
        </div>

        <TripInvitationNotificationList notifications={notifications} now={now} />
      </section>
    </main>
  );
}
