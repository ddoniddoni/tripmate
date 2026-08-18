"use client";

import { shallow } from "@liveblocks/client";
import { useMutation, useOthers, useStorage } from "@liveblocks/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  applyItineraryMutationToStorage,
  getLiveblocksItinerarySnapshot,
  getLiveblocksTripDateRange,
} from "@/features/collaboration/model/liveblocks-itinerary";
import { getLiveblocksPreparationChecklistSnapshot } from "@/features/collaboration/model/liveblocks-preparation-checklist";
import {
  getLiveblocksTripExpenseSettlementState,
  getLiveblocksTripExpenseSnapshot,
} from "@/features/collaboration/model/liveblocks-trip-expenses";
import type {
  TripWorkspaceNavigation,
  TripWorkspaceView,
} from "@/features/collaboration/model/trip-workspace-navigation";
import { useTripWorkspaceNavigation } from "@/features/collaboration/model/use-trip-workspace-navigation";
import { useItinerarySelectionPresence } from "@/features/collaboration/model/use-itinerary-selection-presence";
import { useTripWorkspacePresence } from "@/features/collaboration/model/use-trip-workspace-presence";
import {
  applyAiItineraryPlanToDayNotes,
  type AiItineraryPlanImportFeedback,
} from "@/features/ai-itinerary/model/apply-ai-itinerary-plan";
import type { AiItineraryPlan } from "@/features/ai-itinerary/model/ai-itinerary-plan";
import { useItineraryEditorController } from "@/features/itinerary-editor/model/use-itinerary-editor";
import {
  ItineraryEditorWorkspaceView,
  type ItinerarySelectionCollaborator,
} from "@/features/itinerary-editor/ui/itinerary-editor-workspace";
import { TripPreparationChecklist } from "@/features/preparation-checklist/ui/trip-preparation-checklist";
import { AiItineraryPlannerDialog } from "@/features/ai-itinerary/ui/ai-itinerary-planner-dialog";
import { TripBriefingDialog } from "@/features/trip-briefing/ui/trip-briefing-dialog";
import { TripExpenseWorkspace } from "@/features/trip-expenses/ui/trip-expense-workspace";
import { createTripOverview } from "@/features/trip-overview/model/trip-overview";
import { TripOverviewWorkspaceView } from "@/features/trip-overview/ui/trip-overview-workspace";
import {
  createEmptyTripExpenseSettlementState,
  type TripExpenseSettlementState,
} from "@/entities/expense/model/trip-expense-settlement-state";
import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import type { Trip } from "@/entities/trip/model/trip";

type LiveblocksItineraryEditorProps = {
  canEditItinerary: boolean;
  currentUserId: string;
  initialAiPlannerOpen: boolean;
  initialWorkspaceNavigation: TripWorkspaceNavigation;
  members: readonly TripMember[];
  trip: Trip;
};

type LiveblocksItineraryEditorContentProps = Omit<
  LiveblocksItineraryEditorProps,
  "initialAiPlannerOpen"
> & {
  aiPlannerOpen: boolean;
  expenses: readonly NonNullable<ReturnType<typeof getLiveblocksTripExpenseSnapshot>>["items"][string][];
  expenseSettlementState: TripExpenseSettlementState;
  onAiPlannerOpenChange: (open: boolean) => void;
  preparationItems: readonly NonNullable<
    ReturnType<typeof getLiveblocksPreparationChecklistSnapshot>
  >["items"][string][];
  tripItinerary: NonNullable<ReturnType<typeof getLiveblocksItinerarySnapshot>>;
};

function WorkspaceTabIcon({ view }: { view: TripWorkspaceView }) {
  if (view === "overview") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
      </svg>
    );
  }

  if (view === "itinerary") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        <path d="m8 14 2 2 5-5" />
      </svg>
    );
  }

  if (view === "preparation") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8 5h8M8 3h8v4H8zM6 5H5a1 1 0 0 0-1 1v14h16V6a1 1 0 0 0-1-1h-1" />
        <path d="m8 13 2 2 5-5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M3 9h18M7 15h4" />
    </svg>
  );
}

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
        <span className="workspace-tab-icon">
          <WorkspaceTabIcon view="overview" />
        </span>
        개요
      </button>
      <button
        aria-current={activeView === "itinerary" ? "page" : undefined}
        className={activeView === "itinerary" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("itinerary")}
        type="button"
      >
        <span className="workspace-tab-icon">
          <WorkspaceTabIcon view="itinerary" />
        </span>
        일정
      </button>
      <button
        aria-current={activeView === "preparation" ? "page" : undefined}
        className={activeView === "preparation" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("preparation")}
        type="button"
      >
        <span className="workspace-tab-icon">
          <WorkspaceTabIcon view="preparation" />
        </span>
        준비하기
      </button>
      <button
        aria-current={activeView === "expenses" ? "page" : undefined}
        className={activeView === "expenses" ? "trip-workspace-tab-active" : undefined}
        onClick={() => onChange("expenses")}
        type="button"
      >
        <span className="workspace-tab-icon">
          <WorkspaceTabIcon view="expenses" />
        </span>
        경비
      </button>
    </nav>
  );
}

function LiveblocksItineraryEditorContent({
  canEditItinerary,
  currentUserId,
  aiPlannerOpen,
  expenses,
  expenseSettlementState,
  initialWorkspaceNavigation,
  members,
  onAiPlannerOpenChange,
  preparationItems,
  trip,
  tripItinerary,
}: LiveblocksItineraryEditorContentProps) {
  const workspaceNavigation = useTripWorkspaceNavigation({
    dayIds: tripItinerary.itinerary.dayOrder,
    initialNavigation: initialWorkspaceNavigation,
    pathname: `/trips/${trip.id}`,
  });
  useTripWorkspacePresence(workspaceNavigation.navigation.view);
  const commitMutation = useMutation(
    ({ storage }, mutation) => applyItineraryMutationToStorage(storage, trip, mutation),
    [trip],
  );
  const applyAiItineraryPlan = useMutation(
    ({ storage }, plan: AiItineraryPlan): AiItineraryPlanImportFeedback => {
      const mutationState: {
        result: ReturnType<typeof applyAiItineraryPlanToDayNotes> | null;
      } = { result: null };
      const storageResult = applyItineraryMutationToStorage(storage, trip, (current) => {
        mutationState.result = applyAiItineraryPlanToDayNotes(current, plan);
        return mutationState.result;
      });

      if (!storageResult.success) {
        return { success: false, message: storageResult.message };
      }

      const importResult = mutationState.result;

      if (!importResult) {
        return {
          success: false,
          message: "AI 동선 초안을 일정에 반영하지 못했습니다. 다시 시도해 주세요.",
        };
      }

      if (!importResult.success) {
        return { success: false, message: importResult.message };
      }

      return {
        success: true,
        importedDayCount: importResult.importedDayCount,
        preservedDayCount: importResult.preservedDayCount,
        unmatchedDayCount: importResult.unmatchedDayCount,
      };
    },
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
  useItinerarySelectionPresence(
    workspaceNavigation.navigation.view === "itinerary" ? editor.selectedItemId : null,
  );
  const selectedItemCollaborators = useOthers(
    (others): ItinerarySelectionCollaborator[] =>
      others.flatMap((other) => {
        const selectedItemId = other.presence.selectedItineraryItemId;

        if (!selectedItemId) {
          return [];
        }

        return [
          {
            color: other.info.color,
            connectionId: other.connectionId,
            name: other.info.name,
            selectedItemId,
          },
        ];
      }),
    shallow,
  );
  const overview = createTripOverview({
    expenses,
    itinerary: tripItinerary.itinerary,
    memberIds: members.map((member) => member.userId),
    preparationItems,
    settlementState: expenseSettlementState,
  });
  const memberLabels = getTripMemberLabels(members, currentUserId);

  return (
    <>
      <TripWorkspaceTabs
        activeView={workspaceNavigation.navigation.view}
        onChange={workspaceNavigation.selectView}
      />
      {workspaceNavigation.navigation.view === "overview" ? (
        <TripOverviewWorkspaceView
          headerActions={
            <>
              {canEditItinerary ? (
                <AiItineraryPlannerDialog
                  onApplyPlan={applyAiItineraryPlan}
                  onOpenChange={onAiPlannerOpenChange}
                  open={aiPlannerOpen}
                  trip={trip}
                />
              ) : null}
              <TripBriefingDialog
                currentUserId={currentUserId}
                expenses={expenses}
                itinerary={tripItinerary.itinerary}
                members={members}
                preparationItems={preparationItems}
                settlementState={expenseSettlementState}
                trip={trip}
              />
            </>
          }
          onNavigate={workspaceNavigation.selectView}
          overview={overview}
          trip={trip}
        />
      ) : null}
      {workspaceNavigation.navigation.view === "itinerary" ? (
        <ItineraryEditorWorkspaceView
          canEditItinerary={canEditItinerary}
          editor={editor}
          memberLabels={memberLabels}
          selectedItemCollaborators={selectedItemCollaborators}
        />
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
  initialAiPlannerOpen,
  initialWorkspaceNavigation,
  members,
  trip,
}: LiveblocksItineraryEditorProps) {
  const router = useRouter();
  const [aiPlannerOpen, setAiPlannerOpen] = useState(initialAiPlannerOpen);
  const storage = useStorage((root) => root);
  const expenseSettlementCompletions = useStorage((root) => root.expenseSettlementCompletions);
  const expenseSettlementRevision = useStorage((root) => root.expenseSettlementRevision);
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

  useEffect(() => {
    if (!initialAiPlannerOpen) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    if (!searchParams.has("ai")) {
      return;
    }

    searchParams.delete("ai");
    const query = searchParams.toString();
    const nextPath = query ? `${window.location.pathname}?${query}` : window.location.pathname;

    window.history.replaceState(window.history.state, "", nextPath);
  }, [initialAiPlannerOpen]);

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
  const expenseSettlementState =
    getLiveblocksTripExpenseSettlementState({
      expenseSettlementCompletions,
      expenseSettlementRevision,
    }) ?? createEmptyTripExpenseSettlementState();

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
      aiPlannerOpen={aiPlannerOpen}
      expenses={expenseDocument ? Object.values(expenseDocument.items) : []}
      expenseSettlementState={expenseSettlementState}
      initialWorkspaceNavigation={initialWorkspaceNavigation}
      members={members}
      onAiPlannerOpenChange={setAiPlannerOpen}
      preparationItems={preparationChecklist ? Object.values(preparationChecklist.items) : []}
      trip={sharedTrip}
      tripItinerary={tripItinerary}
    />
  );
}
