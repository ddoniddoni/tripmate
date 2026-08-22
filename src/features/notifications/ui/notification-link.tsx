import Link from "next/link";

type NotificationLinkProps = {
  active?: boolean;
  pendingCount: number;
};

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

export function NotificationLink({ active = false, pendingCount }: NotificationLinkProps) {
  const normalizedCount = Math.max(0, Math.floor(pendingCount));
  const accessibleLabel =
    normalizedCount > 0 ? `알림, 응답할 초대 ${normalizedCount}개` : "알림";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={accessibleLabel}
      className="notification-link"
      href="/notifications"
    >
      <BellIcon />
      {normalizedCount > 0 ? (
        <span aria-hidden="true" className="notification-badge">
          {normalizedCount > 99 ? "99+" : normalizedCount}
        </span>
      ) : null}
    </Link>
  );
}
