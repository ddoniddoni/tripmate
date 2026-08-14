"use client";

import { useMutation, useStorage } from "@liveblocks/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  applyItineraryMutationToStorage,
  getLiveblocksItinerarySnapshot,
  getLiveblocksTripDateRange,
} from "@/features/collaboration/model/liveblocks-itinerary";
import { useItineraryEditorController } from "@/features/itinerary-editor/model/use-itinerary-editor";
import { ItineraryEditorWorkspaceView } from "@/features/itinerary-editor/ui/itinerary-editor-workspace";
import type { Trip } from "@/entities/trip/model/trip";

type LiveblocksItineraryEditorProps = {
  canEditItinerary: boolean;
  currentUserId: string;
  trip: Trip;
};

type LiveblocksItineraryEditorContentProps = LiveblocksItineraryEditorProps & {
  tripItinerary: NonNullable<ReturnType<typeof getLiveblocksItinerarySnapshot>>;
};

function LiveblocksItineraryEditorContent({
  canEditItinerary,
  currentUserId,
  trip,
  tripItinerary,
}: LiveblocksItineraryEditorContentProps) {
  const commitMutation = useMutation(
    ({ storage }, mutation) => applyItineraryMutationToStorage(storage, trip, mutation),
    [trip],
  );
  const editor = useItineraryEditorController({
    canEditItinerary,
    commitMutation,
    currentUserId,
    initialStatusMessage: "공유 일정을 불러왔습니다.",
    tripItinerary,
  });

  return <ItineraryEditorWorkspaceView canEditItinerary={canEditItinerary} editor={editor} />;
}

export function LiveblocksItineraryEditor({
  canEditItinerary,
  currentUserId,
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
      trip={sharedTrip}
      tripItinerary={tripItinerary}
    />
  );
}
