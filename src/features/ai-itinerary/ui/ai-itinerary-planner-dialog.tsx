"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useId, useState } from "react";

import type { Trip } from "@/entities/trip/model/trip";
import { requestAiItineraryPlan } from "@/features/ai-itinerary/api/ai-itinerary-api-adapter";
import type { AiItineraryPlan, AiItineraryStopPeriod } from "@/features/ai-itinerary/model/ai-itinerary-plan";
import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import { formatCalendarDate } from "@/shared/lib/calendar-date";

type AiItineraryPlannerDialogProps = {
  initialOpen?: boolean;
  trip: Trip;
};

const periodLabels: Record<AiItineraryStopPeriod, string> = {
  afternoon: "오후",
  evening: "저녁",
  morning: "오전",
};

function AiRouteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 19.5 9.5 15l3 2.5L19 10" />
      <path d="M15.5 10H19v3.5" />
      <circle cx="5" cy="19" r="1.5" />
      <circle cx="19" cy="10" r="1.5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 1.65 5.35L19 10l-5.35 1.65L12 17l-1.65-5.35L5 10l5.35-1.65L12 3Z" />
      <path d="m18.5 15 .75 2.25L21.5 18l-2.25.75L18.5 21l-.75-2.25L15.5 18l2.25-.75.75-2.25Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 3v3M17 3v3M4.5 9.5h15M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}

function RoutePlan({ plan }: { plan: AiItineraryPlan }) {
  return (
    <div className="ai-itinerary-plan-result">
      <section aria-labelledby="ai-itinerary-plan-overview" className="ai-itinerary-plan-overview">
        <span className="section-kicker">ROUTE DRAFT</span>
        <h3 id="ai-itinerary-plan-overview">{plan.overview}</h3>
        <p>{plan.routeRationale}</p>
      </section>

      <ol aria-label="AI 추천 날짜별 동선" className="ai-itinerary-plan-days">
        {plan.days.map((day, index) => (
          <li key={day.date}>
            <header>
              <span>DAY {String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>
                  {formatCalendarDate(day.date, {
                    day: "numeric",
                    month: "long",
                    weekday: "short",
                  })}
                </strong>
                <h4>{day.theme}</h4>
              </div>
            </header>

            <ol className="ai-itinerary-plan-stops">
              {day.stops.map((stop) => (
                <li key={`${stop.period}-${stop.area}`}>
                  <span>{periodLabels[stop.period]}</span>
                  <div>
                    <strong>{stop.area}</strong>
                    <p>{stop.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="ai-itinerary-route-tip">
              <AiRouteIcon />
              {day.routeTip}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AiItineraryPlannerDialog({
  initialOpen = false,
  trip,
}: AiItineraryPlannerDialogProps) {
  const descriptionId = useId();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(initialOpen);
  const [plan, setPlan] = useState<AiItineraryPlan | null>(null);

  async function handleGenerate() {
    setErrorMessage("");
    setIsLoading(true);

    try {
      setPlan(await requestAiItineraryPlan(trip.id));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AI 동선 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger className="ai-itinerary-trigger" type="button">
        <SparkIcon />
        AI 동선 추천
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby={descriptionId}
          className="dialog-content ai-itinerary-dialog"
        >
          <header className="ai-itinerary-dialog-heading">
            <div>
              <span className="section-kicker">AI ROUTE DRAFT</span>
              <Dialog.Title>여행 동선 초안</Dialog.Title>
              <Dialog.Description className="dialog-description" id={descriptionId}>
                현재 여행 기간과 목적지를 기준으로, 되돌아가는 이동을 줄인 지역별 동선을 제안해요.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="AI 동선 추천 닫기" className="dialog-close" disabled={isLoading}>
              ×
            </Dialog.Close>
          </header>

          <div className="ai-itinerary-dialog-body">
            <section aria-label="추천 기준" className="ai-itinerary-trip-ticket">
              <span aria-hidden="true" className="ai-itinerary-ticket-route" />
              <div>
                <span className="section-kicker">DESTINATION</span>
                <strong>{trip.destination}</strong>
                <p>
                  <CalendarIcon />
                  {formatTripDateRange(trip.startDate, trip.endDate)} ·{" "}
                  {formatTripLength(trip.startDate, trip.endDate)}
                </p>
              </div>
              <span className="ai-itinerary-ticket-spark" aria-hidden="true">
                <SparkIcon />
              </span>
            </section>

            {plan ? <RoutePlan plan={plan} /> : null}

            {errorMessage ? (
              <p className="ai-itinerary-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <aside aria-label="AI 동선 초안 안내" className="ai-itinerary-notice">
              <span aria-hidden="true">!</span>
              <p>
                이 초안은 실제 장소·운영 정보·교통 시간까지 확인한 일정이 아니에요. 마음에 드는
                권역을 고른 뒤 <strong>장소 검색</strong>으로 실제 장소를 추가해 주세요.
              </p>
            </aside>
          </div>

          <footer className="ai-itinerary-actions">
            <Dialog.Close className="secondary-button" disabled={isLoading} type="button">
              닫기
            </Dialog.Close>
            <button className="primary-button" disabled={isLoading} onClick={handleGenerate} type="button">
              <SparkIcon />
              {isLoading ? "동선 구상 중…" : plan ? "새 초안 만들기" : "AI 동선 만들기"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
