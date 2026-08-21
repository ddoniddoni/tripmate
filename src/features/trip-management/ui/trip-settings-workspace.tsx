import type { ReactNode } from "react";

import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import type { TripPermissions } from "@/entities/trip/model/trip-membership";
import type { Trip } from "@/entities/trip/model/trip";

type TripSettingsWorkspaceProps = {
  deletionControl: ReactNode;
  coverControl: ReactNode;
  memberCount: number;
  permissions: TripPermissions;
  sharingControl: ReactNode;
  trip: Trip;
  tripDetailsControl: ReactNode;
};

function SettingsSectionIcon({ name }: { name: "details" | "members" | "danger" }) {
  if (name === "details") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 19.5a2.5 2.5 0 0 1 2.5-2.5H12" />
        <path d="M6.5 4H18a2 2 0 0 1 2 2v12.5a1 1 0 0 1-1.5.86A5 5 0 0 0 16 18.7c-1.05 0-1.98.32-2.75.87A1 1 0 0 1 12 18.75V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5v11" />
        <path d="M8 9h1M15 9h2M15 13h2" />
      </svg>
    );
  }

  if (name === "members") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 4.5a3 3 0 0 1 0 5.8M19.5 20a5 5 0 0 0-3.75-4.84" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 9v4M12 17h.01" />
      <path d="m10.1 4.7-6.2 10.74A2 2 0 0 0 5.63 18.5h12.74a2 2 0 0 0 1.73-3.06L13.9 4.7a2.2 2.2 0 0 0-3.8 0Z" />
    </svg>
  );
}

export function TripSettingsWorkspace({
  coverControl,
  deletionControl,
  memberCount,
  permissions,
  sharingControl,
  trip,
  tripDetailsControl,
}: TripSettingsWorkspaceProps) {
  return (
    <section aria-labelledby="trip-settings-title" className="trip-settings-workspace">
      <header className="trip-settings-heading">
        <span className="section-kicker">여행 관리</span>
        <h2 id="trip-settings-title">여행을 관리해요</h2>
        <p>여행 정보와 멤버를 확인하고, 필요한 설정을 바꿔 보세요.</p>
      </header>

      <div className="trip-settings-grid">
        <section aria-labelledby="trip-settings-details-title" className="trip-settings-card">
          <div className="trip-settings-card-heading">
            <span className="trip-settings-icon" data-variant="details">
              <SettingsSectionIcon name="details" />
            </span>
            <div>
              <span className="section-kicker">기본 정보</span>
              <h3 id="trip-settings-details-title">여행 정보</h3>
              <p>여행 이름, 여행지와 기간을 관리해요.</p>
            </div>
          </div>

          <dl className="trip-settings-summary-list">
            <div>
              <dt>여행지</dt>
              <dd>{trip.destination}</dd>
            </div>
            <div>
              <dt>여행 기간</dt>
              <dd>
                {formatTripDateRange(trip.startDate, trip.endDate)} ·{" "}
                {formatTripLength(trip.startDate, trip.endDate)}
              </dd>
            </div>
            <div>
              <dt>여행 시간대</dt>
              <dd>{trip.timeZone}</dd>
            </div>
          </dl>

          <div className="trip-settings-card-action">
            {permissions.canUpdateTrip ? (
              tripDetailsControl
            ) : (
              <p className="trip-settings-permission-note">여행 정보 수정은 소유자만 할 수 있어요.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="trip-settings-members-title" className="trip-settings-card">
          <div className="trip-settings-card-heading">
            <span className="trip-settings-icon" data-variant="members">
              <SettingsSectionIcon name="members" />
            </span>
            <div>
              <span className="section-kicker">함께하는 사람</span>
              <h3 id="trip-settings-members-title">멤버 관리</h3>
              <p>
                {permissions.canManageMembers
                  ? "여행 멤버를 초대하고 권한을 관리해요."
                  : "함께 여행하는 멤버를 확인할 수 있어요."}
              </p>
            </div>
          </div>

          <div className="trip-settings-member-count">
            <strong>현재 {memberCount}명</strong>
            <span>초대와 참여 상태를 한곳에서 확인해요.</span>
          </div>

          <div className="trip-settings-card-action">{sharingControl}</div>
        </section>
      </div>

      <section aria-labelledby="trip-settings-cover-title" className="trip-settings-cover-card">
        <h3 className="sr-only" id="trip-settings-cover-title">
          여행 커버 사진
        </h3>
        {coverControl}
      </section>

      <section aria-labelledby="trip-settings-danger-title" className="trip-settings-danger-zone">
        <div className="trip-settings-danger-copy">
          <span className="trip-settings-icon" data-variant="danger">
            <SettingsSectionIcon name="danger" />
          </span>
          <div>
            <span className="section-kicker">위험 구역</span>
            <h3 id="trip-settings-danger-title">여행 삭제</h3>
            <p>
              <strong>{trip.title}</strong>의 일정, 멤버와 초대 정보가 모두 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </p>
          </div>
        </div>
        <div className="trip-settings-danger-action">
          {permissions.canDeleteTrip ? (
            deletionControl
          ) : (
            <p className="trip-settings-permission-note">여행 삭제는 소유자만 할 수 있어요.</p>
          )}
        </div>
      </section>
    </section>
  );
}
