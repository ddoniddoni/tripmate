import Link from "next/link";

import {
  isTripInvitationNotificationActionable,
  type TripInvitationNotification,
} from "@/entities/trip/model/trip-invitation";
import { formatTripDateRange } from "@/entities/trip/lib/format-trip";
import { TripInvitationNotificationActions } from "@/features/notifications/ui/trip-invitation-notification-actions";

type TripInvitationNotificationListProps = {
  notifications: readonly TripInvitationNotification[];
  now?: Date;
};

const notificationDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Seoul",
});

function InvitationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7.5 12 12l8-4.5" />
      <rect height="13" rx="2" width="18" x="3" y="5.5" />
      <path d="m8.5 16 2 2 4.5-5" />
    </svg>
  );
}

function getNotificationStatus(
  notification: TripInvitationNotification,
  isActionable: boolean,
) {
  if (isActionable) {
    return { className: "pending", label: "응답이 필요한 초대" };
  }

  if (notification.status === "accepted") {
    return { className: "accepted", label: "수락한 초대" };
  }

  if (notification.status === "declined") {
    return { className: "declined", label: "거절한 초대" };
  }

  return { className: "expired", label: "기간이 지난 초대" };
}

export function TripInvitationNotificationList({
  notifications,
  now = new Date(),
}: TripInvitationNotificationListProps) {
  if (notifications.length === 0) {
    return (
      <section className="notifications-empty" aria-labelledby="notifications-empty-heading">
        <span aria-hidden="true" className="notifications-empty-icon">
          <InvitationIcon />
        </span>
        <h2 id="notifications-empty-heading">새로운 알림이 없어요</h2>
        <p>여행 초대가 도착하면 여기에서 바로 수락하거나 거절할 수 있어요.</p>
        <Link className="secondary-button" href="/trips">
          내 여행으로 돌아가기
        </Link>
      </section>
    );
  }

  return (
    <ol className="notification-list">
      {notifications.map((notification) => {
        const isActionable = isTripInvitationNotificationActionable(notification, now);
        const status = getNotificationStatus(notification, isActionable);
        const roleLabel = notification.role === "editor" ? "편집자" : "보기 전용";

        return (
          <li
            className={`notification-card notification-card-${status.className}`}
            key={notification.id}
          >
            <span aria-hidden="true" className="notification-card-icon">
              <InvitationIcon />
            </span>
            <div className="notification-card-content">
              <div className="notification-card-heading">
                <span className={`notification-status notification-status-${status.className}`}>
                  {status.label}
                </span>
                <time dateTime={notification.createdAt}>
                  {notificationDateFormatter.format(new Date(notification.createdAt))}
                </time>
              </div>
              <h2>{notification.trip.title}에 초대받았어요</h2>
              <p>
                {notification.trip.destination} 여행에 <strong>{roleLabel}</strong> 권한으로 함께해요.
              </p>
              <dl className="notification-trip-meta">
                <div>
                  <dt>여행 일정</dt>
                  <dd>
                    {formatTripDateRange(
                      notification.trip.startDate,
                      notification.trip.endDate,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>초대 권한</dt>
                  <dd>{roleLabel}</dd>
                </div>
              </dl>
              {isActionable ? (
                <TripInvitationNotificationActions invitationId={notification.id} />
              ) : notification.status === "accepted" ? (
                <Link className="notification-trip-link" href={`/trips/${notification.trip.id}`}>
                  여행 열기
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
