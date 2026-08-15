"use client";

import { useMutation, useStorage } from "@liveblocks/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  applyItineraryMutationToStorage,
  getLiveblocksItinerarySnapshot,
  getLiveblocksTripDateRange,
} from "@/features/collaboration/model/liveblocks-itinerary";
import { getLiveblocksPreparationChecklistSnapshot } from "@/features/collaboration/model/liveblocks-preparation-checklist";
import { getLiveblocksTripExpenseSnapshot } from "@/features/collaboration/model/liveblocks-trip-expenses";
import type {
  TripWorkspaceNavigation,
  TripWorkspaceView,
} from "@/features/collaboration/model/trip-workspace-navigation";
import { useTripWorkspaceNavigation } from "@/features/collaboration/model/use-trip-workspace-navigation";
import { useItineraryEditorController } from "@/features/itinerary-editor/model/use-itinerary-editor";
import { ItineraryEditorWorkspaceView } from "@/features/itinerary-editor/ui/itinerary-editor-workspace";
import { TripPreparationChecklist } from "@/features/preparation-checklist/ui/trip-preparation-checklist";
import { TripExpenseWorkspace } from "@/features/trip-expenses/ui/trip-expense-workspace";
import { createTripOverview } from "@/features/trip-overview/model/trip-overview";
import { TripOverviewWorkspaceView } from "@/features/trip-overview/ui/trip-overview-workspace";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import type { Trip } from "@/entities/trip/model/trip";

type LiveblocksItineraryEditorProps = {
  canEditItinerary: boolean;
  currentUserId: string;
  initialWorkspaceNavigation: TripWorkspaceNavigation;
  members: readonly TripMember[];
  trip: Trip;
};

type LiveblocksItineraryEditorContentProps = LiveblocksItineraryEditorProps & {
  expenses: readonly NonNullable<ReturnType<typeof getLiveblocksTripExpenseSnapshot>>["items"][string][];
  preparationItems: readonly NonNullable<
    ReturnType<typeof getLiveblocksPreparationChecklistSnapshot>
  >["items"][string][];
  tripItinerary: NonNullable<ReturnType<typeof getLiveblocksItinerarySnapshot>>;
};

function TripWorkspaceTabs({
  activeView,
  onChange,
}: {
  activeView: TripWorkspaceView;
  onChange: (view: TripWorkspaceView) => void;
}) {
  return (
    <nav aria-label="여행 작업 공간" className="trip-workspace-tabs">
      <button
        aria-current={activeView === "overview" ? "page" : undefined}
        className={activeView === "overview" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("overview")}
        type="button"
      >
        개요
      </button>
      <button
        aria-current={activeView === "itinerary" ? "page" : undefined}
        className={activeView === "itinerary" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("itinerary")}
        type="button"
      >
        일정
      </button>
      <button
        aria-current={activeView === "preparation" ? "page" : undefined}
        className={activeView === "preparation" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("preparation")}
        type="button"
      >
        준비하기
      </button>
      <button
        aria-current={activeView === "expenses" ? "page" : undefined}
        className={activeView === "expenses" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("expenses")}
        type="button"
      >
        경비
      </button>
    </nav>
  );
}

function LiveblocksItineraryEditorContent({
  canEditItinerary,
  currentUserId,
  expenses,
  initialWorkspaceNavigation,
  members,
  preparationItems,
  trip,
  tripItinerary,
}: LiveblocksItineraryEditorContentProps) {
  const workspaceNavigation = useTripWorkspaceNavigation({
    dayIds: tripItinerary.itinerary.dayOrder,
    initialNavigation: initialWorkspaceNavigation,
    pathname: `/trips/${trip.id}`,
  });
  const commitMutation = useMutation(
    ({ storage }, mutation) => applyItineraryMutationToStorage(storage, trip, mutation),
    [trip],
  );
  const editor = useItineraryEditorController({
    canEditItinerary,
    commitMutation,
    currentUserId,
    initialStatusMessage: "공유 일정을 불러왔습니다.",
    onSelectedDayChange: workspaceNavigation.selectDay,
    selectedDayId: workspaceNavigation.navigation.selectedDayId,
    tripItinerary,
  });
  const overview = createTripOverview({
    expenses,
    itinerary: tripItinerary.itinerary,
    preparationItems,
  });

  return (
    <>
      <TripWorkspaceTabs
        activeView={workspaceNavigation.navigation.view}
        onChange={workspaceNavigation.selectView}
      />
      {workspaceNavigation.navigation.view === "overview" ? (
        <TripOverviewWorkspaceView
          onNavigate={workspaceNavigation.selectView}
          overview={overview}
          trip={trip}
        />
      ) : null}
      {workspaceNavigation.navigation.view === "itinerary" ? (
        <ItineraryEditorWorkspaceView canEditItinerary={canEditItinerary} editor={editor} />
      ) : null}
      {workspaceNavigation.navigation.view === "preparation" ? (
        <TripPreparationChecklist
          canEditChecklist={canEditItinerary}
          currentUserId={currentUserId}
          members={members}
        />
      ) : null}
      {workspaceNavigation.navigation.view === "expenses" ? (
        <TripExpenseWorkspace
          canEditExpenses={canEditItinerary}
          currentUserId={currentUserId}
          members={members}
        />
      ) : null}
    </>
  );
}

export function LiveblocksItineraryEditor({
  canEditItinerary,
  currentUserId,
  initialWorkspaceNavigation,
  members,
  trip,
}: LiveblocksItineraryEditorProps) {
  const router = useRouter();
  const storage = useStorage((root) => root);
  const sharedDateRange = getLiveblocksTripDateRange(storage);
  const hasUpdatedTripDates =
    sharedDateRange !== null &&
    (sharedDateRange.startDate !== trip.startDate || sharedDateRange.endDate !== trip.endDate);
  const sharedTrip = sharedDateRange ? { ...trip, ...sharedDateRange } : trip;

  useEffect(() => {
    if (hasUpdatedTripDates) {
      router.refresh();
    }
  }, [hasUpdatedTripDates, router]);

  if (!storage) {
    return (
      <section className="editor-loading-state" role="status" aria-live="polite">
        공유 일정을 불러오는 중이에요…
      </section>
    );
  }

  const tripItinerary = getLiveblocksItinerarySnapshot(sharedTrip, storage);
  const preparationChecklist = getLiveblocksPreparationChecklistSnapshot(storage);
  const expenseDocument = getLiveblocksTripExpenseSnapshot(storage);

  if (!tripItinerary) {
    return (
      <section className="editor-loading-state" role="alert">
        공유 일정을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
      </section>
    );
  }

  return (
    <LiveblocksItineraryEditorContent
      canEditItinerary={canEditItinerary}
      currentUserId={currentUserId}
      expenses={expenseDocument ? Object.values(expenseDocument.items) : []}
      initialWorkspaceNavigation={initialWorkspaceNavigation}
      members={members}
      preparationItems={preparationChecklist ? Object.values(preparationChecklist.items) : []}
      trip={sharedTrip}
      tripItinerary={tripItinerary}
    />
  );
}
