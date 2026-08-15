import Link from "next/link";
import type { ReactNode } from "react";

import type { TripItinerary } from "@/entities/itinerary/model/trip-itinerary";
import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import { ItineraryEditorWorkspace } from "@/features/itinerary-editor/ui/itinerary-editor-workspace";
import { BrandMark } from "@/shared/ui/brand-mark";

type ItineraryEditorShellProps = {
  canEditItinerary?: boolean;
  collaborationControl?: ReactNode;
  deletionControl?: ReactNode;
  historyControl?: ReactNode;
  itineraryEditor?: ReactNode;
  sharingControl?: ReactNode;
  tripDetailsControl?: ReactNode;
  tripItinerary: TripItinerary;
};

export function ItineraryEditorShell({
  canEditItinerary = true,
  collaborationControl,
  deletionControl,
  historyControl,
  itineraryEditor,
  sharingControl,
  tripDetailsControl,
  tripItinerary,
}: ItineraryEditorShellProps) {
  const { trip } = tripItinerary;

  return (
    <main className="editor-shell" data-trip-id={trip.id}>
      <a className="skip-link" href="#trip-workspace-content">
        일정 내용으로 건너뛰기
      </a>
      <header className="editor-header">
        <Link className="brand-link" href="/trips" aria-label="여행 목록으로 이동">
          <BrandMark />
        </Link>

        <div className="trip-heading">
          <span className="trip-kicker">{trip.destination}</span>
          <div>
            <h1>{trip.title}</h1>
            <span className="date-range">
              {formatTripDateRange(trip.startDate, trip.endDate)} ·{" "}
              {formatTripLength(trip.startDate, trip.endDate)}
            </span>
          </div>
        </div>

        <div className="header-actions">
          {tripDetailsControl}
          {collaborationControl ?? (
            <span className="sync-pill">
              <i aria-hidden="true" />
              {canEditItinerary ? "일정은 이 기기에서 편집 중" : "보기 전용 · 일정 변경 불가"}
            </span>
          )}
          {historyControl}
          {sharingControl ?? <span className="share-placeholder">초대 준비 중</span>}
          {deletionControl}
        </div>
      </header>

      <section aria-label="여행 작업 공간" id="trip-workspace-content" tabIndex={-1}>
        {itineraryEditor ?? (
          <ItineraryEditorWorkspace
            canEditItinerary={canEditItinerary}
            initialTripItinerary={tripItinerary}
          />
        )}
      </section>
    </main>
  );
}
