"use client";

import type { ReactNode } from "react";

import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import type { Trip } from "@/entities/trip/model/trip";
import type {
  TripOverview,
  TripOverviewAction,
} from "@/features/trip-overview/model/trip-overview";

type TripOverviewWorkspaceViewProps = {
  headerActions?: ReactNode;
  onNavigate: (view: TripOverviewAction) => void;
  overview: TripOverview;
  trip: Trip;
};

type OverviewIconName = "arrow" | "calendar" | "checklist" | "map" | "pin" | "wallet";

const numberFormatter = new Intl.NumberFormat("ko-KR");
const wonFormatter = new Intl.NumberFormat("ko-KR", {
  currency: "KRW",
  maximumFractionDigits: 0,
  style: "currency",
});
const overviewActionLabels: Record<TripOverviewAction, string> = {
  expenses: "경비로 이동",
  itinerary: "일정으로 이동",
  preparation: "준비하기로 이동",
};

function OverviewIcon({ name }: { name: OverviewIconName }) {
  if (name === "arrow") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.5 3.5v3M17.5 3.5v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" />
      </svg>
    );
  }

  if (name === "checklist") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m5 7 1.5 1.5L9 5.5M12 7h7M5 13l1.5 1.5L9 11.5M12 13h7M5 19l1.5 1.5L9 17.5M12 19h7" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6ZM9 4v14M15 6v14" />
      </svg>
    );
  }

  if (name === "pin") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M4 10h16M16 15h1.5M7 6V4.5h9V6" />
    </svg>
  );
}

function TripOverviewStat({
  action,
  detail,
  icon,
  label,
  onNavigate,
  value,
}: {
  action: TripOverviewAction;
  detail: string;
  icon: OverviewIconName;
  label: string;
  onNavigate: (view: TripOverviewAction) => void;
  value: string;
}) {
  return (
    <button
      aria-label={overviewActionLabels[action]}
      className="trip-overview-stat"
      onClick={() => onNavigate(action)}
      type="button"
    >
      <span className="trip-overview-stat-icon">
        <OverviewIcon name={icon} />
      </span>
      <span className="trip-overview-stat-arrow">
        <OverviewIcon name="arrow" />
      </span>
      <span className="trip-overview-stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

export function TripOverviewWorkspaceView({
  headerActions,
  onNavigate,
  overview,
  trip,
}: TripOverviewWorkspaceViewProps) {
  const tripProgress =
    overview.tripDayCount === 0
      ? 0
      : Math.round((overview.plannedDayCount / overview.tripDayCount) * 100);
  const preparationProgress =
    overview.preparationItemCount === 0
      ? 0
      : Math.round((overview.completedPreparationCount / overview.preparationItemCount) * 100);

  return (
    <section aria-label="여행 개요" className="trip-overview-workspace">
      <div className="trip-overview-canvas">
        <span aria-hidden="true" className="trip-overview-ribbon" />
        <header className="trip-overview-heading">
          <span aria-hidden="true" className="trip-overview-marker" />
          <div className="trip-overview-heading-copy">
            <span className="section-kicker">한눈에 보기</span>
            <h2>여행 개요</h2>
            <p>{trip.destination} 여행의 일정, 준비와 경비를 한곳에서 확인하세요.</p>
          </div>
          {headerActions ? (
            <div className="trip-overview-heading-actions">{headerActions}</div>
          ) : null}
        </header>

        <div className="trip-overview-bento">
          <article className="trip-overview-briefing-card">
            <span className="trip-overview-destination-pill">
              <OverviewIcon name="pin" />
              {trip.destination}
            </span>
            <div>
              <h3>{trip.title}</h3>
              <p>
                <OverviewIcon name="calendar" />
                {formatTripDateRange(trip.startDate, trip.endDate)} ·{" "}
                {formatTripLength(trip.startDate, trip.endDate)}
              </p>
            </div>
          </article>

          <section aria-label="준비 현황" className="trip-overview-progress-card">
            <h3>준비 현황</h3>
            <div className="trip-overview-progress-item">
              <p>
                <span>일정 계획</span>
                <strong>{tripProgress}%</strong>
              </p>
              <div
                aria-label={`일정 계획 ${tripProgress}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={tripProgress}
                className="trip-overview-progress-track"
                role="progressbar"
              >
                <i style={{ width: `${tripProgress}%` }} />
              </div>
            </div>
            <div className="trip-overview-progress-item trip-overview-progress-preparation">
              <p>
                <span>준비 완료</span>
                <strong>{preparationProgress}%</strong>
              </p>
              <div
                aria-label={`준비 완료 ${preparationProgress}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={preparationProgress}
                className="trip-overview-progress-track"
                role="progressbar"
              >
                <i style={{ width: `${preparationProgress}%` }} />
              </div>
            </div>
          </section>

          <button
            aria-label={overview.nextActionCopy.label}
            className="trip-overview-next-card"
            onClick={() => onNavigate(overview.nextAction)}
            type="button"
          >
            <span aria-hidden="true" className="trip-overview-next-route" />
            <span>
              <small>다음 한 걸음</small>
              <strong>{overview.nextActionCopy.title}</strong>
              <span>{overview.nextActionCopy.description}</span>
            </span>
            <span className="trip-overview-next-action">
              {overview.nextActionCopy.label}
              <OverviewIcon name="arrow" />
            </span>
          </button>

          <section aria-label="여행 현황" className="trip-overview-stats">
            <TripOverviewStat
              action="itinerary"
              detail={`${overview.tripDayCount}일 중 ${overview.plannedDayCount}일 계획됨`}
              icon="map"
              label="일정"
              onNavigate={onNavigate}
              value={`${numberFormatter.format(overview.itineraryItemCount)}곳`}
            />
            <TripOverviewStat
              action="preparation"
              detail={`${numberFormatter.format(overview.completedPreparationCount)}개 완료`}
              icon="checklist"
              label="준비하기"
              onNavigate={onNavigate}
              value={`${numberFormatter.format(overview.preparationItemCount)}개`}
            />
            <TripOverviewStat
              action="expenses"
              detail={overview.settlementProgressCopy}
              icon="wallet"
              label="공동 경비"
              onNavigate={onNavigate}
              value={wonFormatter.format(overview.totalExpenseAmount)}
            />
          </section>
        </div>
      </div>
    </section>
  );
}
