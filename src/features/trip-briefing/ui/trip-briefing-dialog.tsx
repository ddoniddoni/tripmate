"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useId } from "react";

import type { TripExpense, TripExpenseCategory } from "@/entities/expense/model/trip-expense";
import {
  getTripExpenseSettlementTransferCompletion,
  type TripExpenseSettlementState,
} from "@/entities/expense/model/trip-expense-settlement-state";
import type { ItineraryDocument } from "@/entities/itinerary/model/trip-itinerary";
import type { PreparationChecklistCategory, PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import type { Trip } from "@/entities/trip/model/trip";
import { createTripBriefing } from "@/features/trip-briefing/model/create-trip-briefing";
import { formatCalendarDate } from "@/shared/lib/calendar-date";

type TripBriefingDialogProps = {
  currentUserId: string;
  expenses: readonly TripExpense[];
  itinerary: ItineraryDocument;
  members: readonly TripMember[];
  preparationItems: readonly PreparationChecklistItem[];
  settlementState: TripExpenseSettlementState;
  trip: Trip;
};

type BriefingIconName = "calendar" | "check" | "download" | "location" | "wallet";

const wonFormatter = new Intl.NumberFormat("ko-KR", {
  currency: "KRW",
  maximumFractionDigits: 0,
  style: "currency",
});

const preparationCategoryCopy: Record<PreparationChecklistCategory, string> = {
  booking: "예약",
  other: "기타",
  packing: "짐 꾸리기",
  transport: "이동",
};

const expenseCategoryCopy: Record<TripExpenseCategory, string> = {
  activity: "관광·체험",
  food: "식비",
  other: "기타",
  stay: "숙소",
  transport: "교통",
};

function BriefingIcon({ name }: { name: BriefingIconName }) {
  if (name === "calendar") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 3v3M17 3v3M4.5 9.5h15M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m5 12.5 4 4L19 6.5" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="14" rx="2" width="17" x="3.5" y="6.5" />
      <path d="M3.5 11h17M16.5 16h1.5M7.5 6.5V5h9v1.5" />
    </svg>
  );
}

function formatDuration(durationMinutes: number | undefined) {
  if (!durationMinutes) {
    return null;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

function formatWon(amount: number) {
  return wonFormatter.format(amount);
}

function getMemberLabel(memberLabels: ReadonlyMap<string, string>, userId: string) {
  return memberLabels.get(userId) ?? "여행 멤버";
}

function getSettlementCopy({
  completedTransferCount,
  expenseCount,
  transferCount,
}: {
  completedTransferCount: number;
  expenseCount: number;
  transferCount: number;
}) {
  if (expenseCount === 0) {
    return "아직 기록된 공동 경비가 없어요.";
  }

  if (transferCount === 0) {
    return "추가 송금 없이 정산이 끝났어요.";
  }

  if (completedTransferCount === transferCount) {
    return "모든 송금이 완료됐어요.";
  }

  return `${transferCount - completedTransferCount}건의 송금이 남아 있어요.`;
}

export function TripBriefingDialog({
  currentUserId,
  expenses,
  itinerary,
  members,
  preparationItems,
  settlementState,
  trip,
}: TripBriefingDialogProps) {
  const descriptionId = useId();
  const titleId = useId();
  const memberLabels = getTripMemberLabels(members, currentUserId);
  const briefing = createTripBriefing({
    expenses,
    itinerary,
    memberIds: members.map((member) => member.userId),
    preparationItems,
    settlementState,
  });
  const itineraryItemCount = briefing.days.reduce((count, day) => count + day.items.length, 0);
  const settlementCopy = getSettlementCopy({
    completedTransferCount: briefing.settlementProgress.completedTransferCount,
    expenseCount: briefing.expenses.length,
    transferCount: briefing.settlementProgress.totalTransferCount,
  });

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger className="trip-briefing-trigger" type="button">
        <BriefingIcon name="download" />
        여행 브리핑
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay trip-briefing-overlay" />
        <Dialog.Content
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="dialog-content trip-briefing-dialog"
        >
          <header className="trip-briefing-dialog-heading">
            <div>
              <span className="section-kicker">출발 전 한 장</span>
              <Dialog.Title id={titleId}>여행 브리핑</Dialog.Title>
              <Dialog.Description className="dialog-description" id={descriptionId}>
                일정, 준비물, 정산 현황을 인쇄하거나 PDF로 저장할 수 있어요.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="여행 브리핑 닫기" className="dialog-close">
              ×
            </Dialog.Close>
          </header>

          <article aria-label={`${trip.title} 여행 브리핑`} className="trip-briefing-sheet">
            <header className="trip-briefing-hero">
              <div className="trip-briefing-hero-topline">
                <span>TRIP BRIEFING</span>
                <span>{formatTripLength(trip.startDate, trip.endDate)}</span>
              </div>
              <div className="trip-briefing-hero-copy">
                <span className="trip-briefing-destination">
                  <BriefingIcon name="location" />
                  {trip.destination}
                </span>
                <h2>{trip.title}</h2>
                <p>
                  <BriefingIcon name="calendar" />
                  {formatTripDateRange(trip.startDate, trip.endDate)}
                </p>
              </div>
              <span aria-hidden="true" className="trip-briefing-route-mark">
                <i />
                <i />
                <i />
              </span>
            </header>

            <section aria-label="여행 요약" className="trip-briefing-summary">
              <div>
                <span>일정</span>
                <strong>{itineraryItemCount}곳</strong>
                <small>{briefing.days.length}일간의 동선</small>
              </div>
              <div>
                <span>준비</span>
                <strong>
                  {briefing.preparation.completedCount}/{briefing.preparation.totalCount}
                </strong>
                <small>완료한 할 일</small>
              </div>
              <div>
                <span>공동 경비</span>
                <strong>{formatWon(briefing.settlement.totalAmount)}</strong>
                <small>{briefing.expenses.length}건 기록됨</small>
              </div>
            </section>

            <section aria-labelledby="trip-briefing-itinerary-heading" className="trip-briefing-itinerary">
              <div className="trip-briefing-section-heading">
                <span className="trip-briefing-section-number">01</span>
                <div>
                  <span className="section-kicker">ITINERARY</span>
                  <h3 id="trip-briefing-itinerary-heading">날짜별 여행 동선</h3>
                </div>
              </div>
              <ol className="trip-briefing-day-list">
                {briefing.days.map(({ day, items }, index) => (
                  <li className="trip-briefing-day" key={day.id}>
                    <header>
                      <span>DAY {String(index + 1).padStart(2, "0")}</span>
                      <h4>
                        {formatCalendarDate(day.date, {
                          day: "numeric",
                          month: "long",
                          weekday: "short",
                        })}
                      </h4>
                      {day.note ? <p>{day.note}</p> : null}
                    </header>
                    {items.length > 0 ? (
                      <ol className="trip-briefing-schedule-list">
                        {items.map((item, itemIndex) => {
                          const duration = formatDuration(item.durationMinutes);

                          return (
                            <li key={item.id}>
                              <time>{item.startTime ?? "시간 미정"}</time>
                              <span aria-hidden="true" className="trip-briefing-schedule-dot" />
                              <div>
                                <strong>
                                  <span>{String(itemIndex + 1).padStart(2, "0")}</span>
                                  {item.place.name}
                                </strong>
                                <p>
                                  {item.place.address}
                                  {duration ? ` · ${duration}` : ""}
                                </p>
                                {item.note ? <small>{item.note}</small> : null}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="trip-briefing-empty-copy">아직 확정한 일정이 없어요.</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <div className="trip-briefing-footer-grid">
              <section
                aria-labelledby="trip-briefing-preparation-heading"
                className="trip-briefing-footer-section"
              >
                <div className="trip-briefing-section-heading">
                  <span className="trip-briefing-section-number">02</span>
                  <div>
                    <span className="section-kicker">BEFORE YOU GO</span>
                    <h3 id="trip-briefing-preparation-heading">출발 전 체크</h3>
                  </div>
                </div>
                <p className="trip-briefing-section-summary">
                  {briefing.preparation.totalCount === 0
                    ? "아직 준비 항목이 없어요."
                    : `${briefing.preparation.completedCount}개 완료 · ${briefing.incompletePreparationItems.length}개 남음`}
                </p>
                {briefing.incompletePreparationItems.length > 0 ? (
                  <ol className="trip-briefing-preparation-list">
                    {briefing.incompletePreparationItems.map((item) => (
                      <li key={item.id}>
                        <span aria-hidden="true" className="trip-briefing-check-circle">
                          <BriefingIcon name="check" />
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {preparationCategoryCopy[item.category]}
                            {item.assigneeId
                              ? ` · ${getMemberLabel(memberLabels, item.assigneeId)} 담당`
                              : " · 담당자 미정"}
                          </small>
                        </span>
                        {item.isPriority ? <em>우선</em> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>

              <section
                aria-labelledby="trip-briefing-expense-heading"
                className="trip-briefing-footer-section trip-briefing-expense-section"
              >
                <div className="trip-briefing-section-heading">
                  <span className="trip-briefing-section-number">03</span>
                  <div>
                    <span className="section-kicker">SHARED EXPENSES</span>
                    <h3 id="trip-briefing-expense-heading">공동 경비 정리</h3>
                  </div>
                </div>
                <div className="trip-briefing-expense-total">
                  <span>현재까지 함께 쓴 돈</span>
                  <strong>{formatWon(briefing.settlement.totalAmount)}</strong>
                </div>
                <p className="trip-briefing-section-summary">{settlementCopy}</p>
                {briefing.settlement.transfers.length > 0 ? (
                  <ol className="trip-briefing-settlement-list">
                    {briefing.settlement.transfers.map((transfer) => {
                      const isComplete =
                        getTripExpenseSettlementTransferCompletion(settlementState, transfer) !== null;

                      return (
                        <li key={`${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount}`}>
                          <span>{getMemberLabel(memberLabels, transfer.fromUserId)}</span>
                          <i aria-hidden="true">→</i>
                          <span>{getMemberLabel(memberLabels, transfer.toUserId)}</span>
                          <strong>{formatWon(transfer.amount)}</strong>
                          <em className={isComplete ? "is-complete" : undefined}>
                            {isComplete ? "완료" : "송금 대기"}
                          </em>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                {briefing.expenses.length > 0 ? (
                  <ol aria-label="최근 지출" className="trip-briefing-expense-list">
                    {briefing.expenses.map((expense) => (
                      <li key={expense.id}>
                        <span>{expenseCategoryCopy[expense.category]}</span>
                        <strong>{expense.title}</strong>
                        <em>{formatWon(expense.amount)}</em>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>
            </div>

            <footer className="trip-briefing-sheet-footer">
              <span>TRIPMATE · 함께 만든 여행의 한 장</span>
              <span>{formatTripDateRange(trip.startDate, trip.endDate)}</span>
            </footer>
          </article>

          <footer className="trip-briefing-actions">
            <Dialog.Close className="secondary-button" type="button">
              닫기
            </Dialog.Close>
            <button className="primary-button trip-briefing-print-button" onClick={handlePrint} type="button">
              <BriefingIcon name="download" />
              인쇄 · PDF로 저장
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
