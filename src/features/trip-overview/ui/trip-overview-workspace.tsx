"use client";

import type { Trip } from "@/entities/trip/model/trip";
import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import type {
  TripOverview,
  TripOverviewAction,
} from "@/features/trip-overview/model/trip-overview";

type TripOverviewWorkspaceViewProps = {
  onNavigate: (view: TripOverviewAction) => void;
  overview: TripOverview;
  trip: Trip;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");
const wonFormatter = new Intl.NumberFormat("ko-KR", {
  currency: "KRW",
  maximumFractionDigits: 0,
  style: "currency",
});

function TripOverviewStat({
  action,
  detail,
  label,
  onNavigate,
  value,
}: {
  action: TripOverviewAction;
  detail: string;
  label: string;
  onNavigate: (view: TripOverviewAction) => void;
  value: string;
}) {
  return (
    <button className="trip-overview-stat" onClick={() => onNavigate(action)} type="button">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <i aria-hidden="true">↗</i>
    </button>
  );
}

export function TripOverviewWorkspaceView({
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
      <header className="trip-overview-briefing">
        <div>
          <span className="section-kicker">여행 개요</span>
          <h2>{trip.title}</h2>
          <p>
            {trip.destination} · {formatTripDateRange(trip.startDate, trip.endDate)} · {formatTripLength(
              trip.startDate,
              trip.endDate,
            )}
          </p>
        </div>
        <div className="trip-overview-route-card">
          <span>여행 준비도</span>
          <strong>{Math.round((tripProgress + preparationProgress) / 2)}%</strong>
          <div aria-label={`일정 계획 ${tripProgress}%, 준비 완료 ${preparationProgress}%`}>
            <i style={{ width: `${tripProgress}%` }} />
            <i style={{ width: `${preparationProgress}%` }} />
          </div>
          <p>일정과 준비 항목을 기준으로 계산했어요.</p>
        </div>
      </header>

      <div className="trip-overview-main-grid">
        <section aria-labelledby="trip-overview-next-heading" className="trip-overview-next-card">
          <div className="trip-overview-next-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <span className="section-kicker">다음 한 걸음</span>
            <h3 id="trip-overview-next-heading">{overview.nextActionCopy.title}</h3>
            <p>{overview.nextActionCopy.description}</p>
            <button onClick={() => onNavigate(overview.nextAction)} type="button">
              {overview.nextActionCopy.label}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <section aria-label="여행 현황" className="trip-overview-stats">
          <TripOverviewStat
            action="itinerary"
            detail={`${overview.tripDayCount}일 중 ${overview.plannedDayCount}일 계획됨`}
            label="일정"
            onNavigate={onNavigate}
            value={`${numberFormatter.format(overview.itineraryItemCount)}곳`}
          />
          <TripOverviewStat
            action="preparation"
            detail={`${numberFormatter.format(overview.completedPreparationCount)}개 완료`}
            label="준비하기"
            onNavigate={onNavigate}
            value={`${numberFormatter.format(overview.preparationItemCount)}개`}
          />
          <TripOverviewStat
            action="expenses"
            detail={`${numberFormatter.format(overview.expenseCount)}건 기록됨`}
            label="공동 경비"
            onNavigate={onNavigate}
            value={wonFormatter.format(overview.totalExpenseAmount)}
          />
        </section>
      </div>

      <section aria-labelledby="trip-overview-flow-heading" className="trip-overview-flow">
        <div>
          <span className="section-kicker">준비 흐름</span>
          <h3 id="trip-overview-flow-heading">여행을 함께 완성하는 세 가지</h3>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>동선 세우기</strong>
              <p>장소 {numberFormatter.format(overview.itineraryItemCount)}곳을 여행 날짜에 배치했어요.</p>
            </div>
            <button aria-label="일정으로 이동" onClick={() => onNavigate("itinerary")} type="button">
              일정 보기
            </button>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>출발 준비</strong>
              <p>
                준비 항목 {numberFormatter.format(overview.completedPreparationCount)} / {numberFormatter.format(overview.preparationItemCount)}개를 마쳤어요.
              </p>
            </div>
            <button aria-label="준비하기로 이동" onClick={() => onNavigate("preparation")} type="button">
              준비 보기
            </button>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>함께 쓴 돈</strong>
              <p>현재 {numberFormatter.format(overview.expenseCount)}건의 지출을 기록했어요.</p>
            </div>
            <button aria-label="경비로 이동" onClick={() => onNavigate("expenses")} type="button">
              경비 보기
            </button>
          </li>
        </ol>
      </section>
    </section>
  );
}
