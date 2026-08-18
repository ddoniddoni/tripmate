import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import {
  addPlaceSuggestion,
  addPlaceSuggestionComment,
  duplicateItineraryDayItems,
  duplicateItineraryItem,
  moveItineraryItem,
  promotePlaceSuggestion,
  togglePlaceSuggestionVote,
  updateTripDayNote,
  updateItineraryItem,
} from "@/entities/itinerary/model/mutations";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { createMockAiItineraryPlan } from "@/features/ai-itinerary/api/mock-itinerary-plan";
import { applyAiItineraryPlanToDayNotes } from "@/features/ai-itinerary/model/apply-ai-itinerary-plan";
import {
  applyItineraryMutationToStorage,
  createTripItineraryStorage,
  getLiveblocksItinerarySnapshot,
  getLiveblocksTripDateRange,
} from "@/features/collaboration/model/liveblocks-itinerary";

function createStorageRoot() {
  return new LiveObject(createTripItineraryStorage(jejuTrip.itinerary));
}

describe("Liveblocks itinerary storage", () => {
  it("round-trips the validated itinerary document through Liveblocks structures", () => {
    const storage = createStorageRoot();

    expect(getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON())).toEqual(jejuTrip);
  });

  it("adds candidate place storage to existing rooms without losing their itinerary", () => {
    const storage = createStorageRoot();
    storage.delete("placeSuggestions");

    expect(getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON())).toMatchObject({
      itinerary: { placeSuggestions: {} },
    });

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      addPlaceSuggestion(current, {
        suggestion: {
          comments: {},
          createdAt: "2026-01-20T10:00:00.000Z",
          createdBy: "user-minji",
          dayId: "jeju-day-1",
          id: "legacy-room-candidate",
          place: jejuTrip.itinerary.items["hamdeok-beach"].place,
          votes: {},
        },
      }),
    );

    expect(result.success).toBe(true);
    expect(storage.toJSON().placeSuggestions["legacy-room-candidate"]).toMatchObject({
      id: "legacy-room-candidate",
    });
    expect(storage.toJSON().items).toEqual(jejuTrip.itinerary.items);
  });

  it("commits a cross-day move while preserving the domain invariants", () => {
    const storage = createStorageRoot();

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      moveItineraryItem(current, {
        destinationDayId: "jeju-day-2",
        itemId: "woojin-breakfast",
        sourceDayId: "jeju-day-1",
        toIndex: 0,
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-1"]?.itemIds).not.toContain("woojin-breakfast");
    expect(snapshot?.itinerary.days["jeju-day-2"]?.itemIds).toEqual(["woojin-breakfast"]);
    expect(snapshot?.itinerary.items["woojin-breakfast"]?.dayId).toBe("jeju-day-2");
  });

  it("updates only the edited item fields without resetting a different item", () => {
    const storage = createStorageRoot();

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      updateItineraryItem(current, {
        itemId: "hamdeok-beach",
        changes: {
          note: "일몰 전에 도착",
          updatedAt: "2026-01-16T09:00:00.000Z",
        },
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.items["hamdeok-beach"]?.note).toBe("일몰 전에 도착");
    expect(snapshot?.itinerary.items["bijarim-forest"]).toEqual(
      jejuTrip.itinerary.items["bijarim-forest"],
    );
  });

  it("keeps shared day notes and candidate places in the Liveblocks itinerary document", () => {
    const storage = createStorageRoot();
    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) => {
      const withMemo = updateTripDayNote(current, {
        dayId: "jeju-day-2",
        note: "비가 오면 카페를 먼저 가기",
      });

      if (!withMemo.success) {
        return withMemo;
      }

      return addPlaceSuggestion(withMemo.data, {
        suggestion: {
          comments: {},
          createdAt: "2026-01-20T10:00:00.000Z",
          createdBy: "user-minji",
          dayId: "jeju-day-2",
          id: "osulloc-candidate",
          place: jejuTrip.itinerary.items["bijarim-forest"].place,
          votes: {},
        },
      });
    });
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-2"]?.note).toBe("비가 오면 카페를 먼저 가기");
    expect(snapshot?.itinerary.placeSuggestions["osulloc-candidate"]?.dayId).toBe("jeju-day-2");

    const promoted = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      promotePlaceSuggestion(current, {
        createdBy: "user-jiwoo",
        newItemId: "osulloc-scheduled",
        suggestionId: "osulloc-candidate",
        updatedAt: "2026-01-20T11:00:00.000Z",
      }),
    );
    const promotedSnapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(promoted.success).toBe(true);
    expect(promotedSnapshot?.itinerary.placeSuggestions["osulloc-candidate"]).toBeUndefined();
    expect(promotedSnapshot?.itinerary.items["osulloc-scheduled"]?.dayId).toBe("jeju-day-2");
  });

  it("synchronizes an AI draft as shared day memos without altering confirmed places", () => {
    const storage = createStorageRoot();
    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      applyAiItineraryPlanToDayNotes(current, createMockAiItineraryPlan(jejuTrip.trip)),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-1"]?.note).toContain("[AI 동선 초안]");
    expect(snapshot?.itinerary.days["jeju-day-4"]?.note).toContain("[AI 동선 초안]");
    expect(snapshot?.itinerary.items).toEqual(jejuTrip.itinerary.items);
  });

  it("persists candidate votes and comments in nested collaborative maps", () => {
    const storage = createStorageRoot();
    const suggestionId = "collaborative-candidate";

    applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      addPlaceSuggestion(current, {
        suggestion: {
          comments: {},
          createdAt: "2026-01-20T10:00:00.000Z",
          createdBy: "user-minji",
          dayId: "jeju-day-1",
          id: suggestionId,
          place: jejuTrip.itinerary.items["hamdeok-beach"].place,
          votes: {},
        },
      }),
    );
    applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      togglePlaceSuggestionVote(current, {
        suggestionId,
        userId: "user-jiwoo",
        votedAt: "2026-01-20T10:05:00.000Z",
      }),
    );
    const commented = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      addPlaceSuggestionComment(current, {
        comment: {
          body: "산책 코스로 좋아 보여요.",
          createdAt: "2026-01-20T10:06:00.000Z",
          createdBy: "user-jiwoo",
          id: "collaborative-comment",
        },
        suggestionId,
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(commented.success).toBe(true);
    expect(snapshot?.itinerary.placeSuggestions[suggestionId]?.votes).toEqual({
      "user-jiwoo": "2026-01-20T10:05:00.000Z",
    });
    expect(snapshot?.itinerary.placeSuggestions[suggestionId]?.comments).toMatchObject({
      "collaborative-comment": {
        body: "산책 코스로 좋아 보여요.",
      },
    });
  });

  it("persists a duplicated item immediately after its source", () => {
    const storage = createStorageRoot();

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      duplicateItineraryItem(current, {
        createdBy: "user-minji",
        itemId: "woojin-breakfast",
        newItemId: "woojin-breakfast-copy",
        updatedAt: "2026-01-20T10:00:00.000Z",
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-1"]?.itemIds).toEqual([
      "woojin-breakfast",
      "woojin-breakfast-copy",
      "hamdeok-beach",
      "bijarim-forest",
    ]);
    expect(snapshot?.itinerary.items["woojin-breakfast-copy"]).toMatchObject({
      createdBy: "user-minji",
      id: "woojin-breakfast-copy",
    });
  });

  it("persists a complete day copy as one collaborative document update", () => {
    const storage = createStorageRoot();
    const newItemIds = ["day-copy-1", "day-copy-2", "day-copy-3"];

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      duplicateItineraryDayItems(current, {
        createdBy: "user-minji",
        destinationDayId: "jeju-day-2",
        newItemIds,
        sourceDayId: "jeju-day-1",
        updatedAt: "2026-01-20T12:00:00.000Z",
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-2"]?.itemIds).toEqual(newItemIds);
    expect(snapshot?.itinerary.items["day-copy-1"]).toMatchObject({
      createdBy: "user-minji",
      dayId: "jeju-day-2",
      place: jejuTrip.itinerary.items["woojin-breakfast"].place,
    });
    expect(snapshot?.itinerary.days["jeju-day-1"]?.itemIds).toEqual(
      jejuTrip.itinerary.days["jeju-day-1"].itemIds,
    );
  });

  it("derives the active trip date range from shared itinerary days", () => {
    const storage = createStorageRoot();

    expect(getLiveblocksTripDateRange(storage.toJSON())).toEqual({
      endDate: "2026-04-21",
      startDate: "2026-04-18",
    });
  });
});
