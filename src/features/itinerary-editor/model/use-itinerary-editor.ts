"use client";

import { type DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useEffect, useRef, useState } from "react";

import {
  addPlaceSuggestion,
  addPlaceSuggestionComment,
  addItineraryItem,
  duplicateItineraryDayItems,
  duplicateItineraryItem,
  moveItineraryItem,
  promotePlaceSuggestion,
  removePlaceSuggestion,
  removeItineraryItem,
  reorderItineraryItem,
  sortItineraryItemsByStartTime,
  togglePlaceSuggestionVote,
  updateTripDayNote,
  updateItineraryItem,
  type ItineraryMutationResult,
} from "@/entities/itinerary/model/mutations";
import {
  selectItemsForDay,
  selectOrderedDays,
  selectPlaceSuggestionsForDay,
} from "@/entities/itinerary/model/selectors";
import type { TripItinerary } from "@/entities/itinerary/model/trip-itinerary";
import {
  getDayIdFromDropTarget,
  getDragHandleId,
  getTimelineItemId,
} from "@/features/itinerary-editor/model/dnd-targets";
import type { ItineraryItemFormValues } from "@/features/itinerary-editor/model/itinerary-item-form";
import type { PlaceSuggestionFormValues } from "@/features/itinerary-editor/model/place-suggestion-form";

export type ItineraryEditorMutation = (
  current: TripItinerary,
) => ItineraryMutationResult;

export type CommitItineraryMutation = (
  mutation: ItineraryEditorMutation,
) => ItineraryMutationResult;

type EditorDialogState =
  | { type: "closed" }
  | { type: "add" }
  | { type: "edit"; itemId: string };

type MobileView = "itinerary" | "map";

function restoreDragHandleFocus(itemId: string) {
  document.getElementById(getDragHandleId(itemId))?.focus();
}

type UseItineraryEditorControllerOptions = {
  canEditItinerary?: boolean;
  commitMutation: CommitItineraryMutation;
  currentUserId?: string;
  initialStatusMessage?: string;
  onSelectedDayChange?: (dayId: string) => void;
  selectedDayId?: string;
  tripItinerary: TripItinerary;
};

export function useItineraryEditorController({
  canEditItinerary = true,
  commitMutation,
  currentUserId = "user-jiwoo",
  initialStatusMessage = "로컬 편집을 시작할 수 있습니다.",
  onSelectedDayChange,
  selectedDayId: controlledSelectedDayId,
  tripItinerary,
}: UseItineraryEditorControllerOptions) {
  const [uncontrolledSelectedDayId, setUncontrolledSelectedDayId] = useState(
    () => tripItinerary.itinerary.dayOrder[0] ?? "",
  );
  const [dialogState, setDialogState] = useState<EditorDialogState>({ type: "closed" });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("itinerary");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const scrollTargetItemIdRef = useRef<string | null>(null);
  const [isDuplicateDayDialogOpen, setIsDuplicateDayDialogOpen] = useState(false);
  const [isItinerarySearchOpen, setIsItinerarySearchOpen] = useState(false);
  const [isPlaceSuggestionDialogOpen, setIsPlaceSuggestionDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);

  const { trip, itinerary } = tripItinerary;
  const days = selectOrderedDays(itinerary);
  const selectedDayId = controlledSelectedDayId ?? uncontrolledSelectedDayId;
  const selectedDay = itinerary.days[selectedDayId] ?? days[0];
  const itineraryItems = selectedDay ? selectItemsForDay(itinerary, selectedDay.id) : [];
  const placeSuggestions = selectedDay
    ? selectPlaceSuggestionsForDay(itinerary, selectedDay.id)
    : [];
  const destinationName = trip.destination.split("·").at(-1)?.trim() ?? trip.destination;
  const editingItem =
    dialogState.type === "edit" ? itinerary.items[dialogState.itemId] : undefined;
  const deletingItem = deleteItemId ? itinerary.items[deleteItemId] : undefined;
  const movingItem = moveItemId ? itinerary.items[moveItemId] : undefined;
  const selectedDayIndex = selectedDay ? itinerary.dayOrder.indexOf(selectedDay.id) : -1;

  useEffect(() => {
    const scrollTargetItemId = scrollTargetItemIdRef.current;

    if (!scrollTargetItemId) {
      return;
    }

    const target = document.getElementById(getTimelineItemId(scrollTargetItemId));

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    scrollTargetItemIdRef.current = null;
  }, [selectedDayId]);

  function setSelectedDayId(dayId: string) {
    if (controlledSelectedDayId === undefined) {
      setUncontrolledSelectedDayId(dayId);
    }

    onSelectedDayChange?.(dayId);
  }

  function applyMutation(mutation: ItineraryEditorMutation, successMessage: string) {
    const result = commitMutation(mutation);

    if (!result.success) {
      setStatusMessage(result.message);
      return false;
    }

    setStatusMessage(successMessage);
    return true;
  }

  function ensureCanEditItinerary() {
    if (canEditItinerary) {
      return true;
    }

    setStatusMessage("보기 전용 권한에서는 일정을 변경할 수 없습니다.");
    return false;
  }

  function handleSelectDay(dayId: string, index: number) {
    setSelectedDayId(dayId);
    setSelectedItemId(null);
    setStatusMessage(`${index + 1}일차 일정을 선택했습니다.`);
  }

  function handleSelectItem(itemId: string) {
    const item = itinerary.items[itemId];

    if (!item) {
      setStatusMessage("선택할 일정 아이템을 찾을 수 없습니다.");
      return;
    }

    setSelectedItemId(itemId);
    setStatusMessage(`${item.place.name}을 선택했습니다.`);
    document.getElementById(getTimelineItemId(itemId))?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function handleFindItem(itemId: string) {
    const item = itinerary.items[itemId];

    if (!item) {
      setStatusMessage("찾은 일정 아이템을 불러올 수 없습니다.");
      return;
    }

    const dayIndex = itinerary.dayOrder.indexOf(item.dayId);

    if (dayIndex < 0) {
      setStatusMessage("찾은 일정의 날짜를 불러올 수 없습니다.");
      return;
    }

    if (item.dayId === selectedDayId) {
      document.getElementById(getTimelineItemId(item.id))?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      scrollTargetItemIdRef.current = item.id;
      setSelectedDayId(item.dayId);
    }

    setSelectedItemId(item.id);
    setMobileView("itinerary");
    setStatusMessage(`${item.place.name}이 있는 ${dayIndex + 1}일차로 이동했습니다.`);
  }

  function handleFormSubmit(values: ItineraryItemFormValues) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    const updatedAt = new Date().toISOString();
    const placeFields = {
      name: values.name,
      address: values.address,
      longitude: Number(values.longitude),
      latitude: Number(values.latitude),
      category: values.category || undefined,
    };
    const editableFields = {
      place: {
        provider: "mapbox" as const,
        providerPlaceId: editingItem?.place.providerPlaceId ?? "",
        ...placeFields,
      },
      startTime: values.startTime || undefined,
      durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
      note: values.note || undefined,
      updatedAt,
    };

    if (editingItem) {
      if (
        applyMutation(
          (current) =>
            updateItineraryItem(current, {
              itemId: editingItem.id,
              changes: editableFields,
            }),
          `${values.name} 일정을 수정했습니다.`,
        )
      ) {
        setDialogState({ type: "closed" });
      }
      return;
    }

    if (!selectedDay) {
      setStatusMessage("장소를 추가할 날짜를 찾을 수 없습니다.");
      return;
    }

    const itemId = crypto.randomUUID();
    if (
      applyMutation(
        (current) =>
          addItineraryItem(current, {
            item: {
              id: itemId,
              dayId: selectedDay.id,
              ...editableFields,
              place: {
                ...editableFields.place,
                providerPlaceId: `mock.mapbox.manual.${itemId}`,
              },
              createdBy: currentUserId,
            },
          }),
        `${values.name}을 ${selectedDayIndex + 1}일차에 추가했습니다.`,
      )
    ) {
      setSelectedItemId(itemId);
      setDialogState({ type: "closed" });
    }
  }

  function handleDayNoteSubmit(note: string) {
    if (!ensureCanEditItinerary()) {
      return false;
    }

    if (!selectedDay) {
      setStatusMessage("메모를 저장할 날짜를 찾을 수 없습니다.");
      return false;
    }

    return applyMutation(
      (current) =>
        updateTripDayNote(current, {
          dayId: selectedDay.id,
          note: note || undefined,
        }),
      note ? "오늘의 메모를 저장했습니다." : "오늘의 메모를 지웠습니다.",
    );
  }

  function handlePlaceSuggestionSubmit({ note, place }: PlaceSuggestionFormValues) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    if (!selectedDay) {
      setStatusMessage("장소를 제안할 날짜를 찾을 수 없습니다.");
      return;
    }

    const suggestionId = crypto.randomUUID();

    if (
      applyMutation(
        (current) =>
          addPlaceSuggestion(current, {
            suggestion: {
              comments: {},
              createdAt: new Date().toISOString(),
              createdBy: currentUserId,
              dayId: selectedDay.id,
              id: suggestionId,
              note: note || undefined,
              place,
              votes: {},
            },
          }),
        `${place.name}을 후보 장소로 제안했습니다.`,
      )
    ) {
      setIsPlaceSuggestionDialogOpen(false);
    }
  }

  function handlePromotePlaceSuggestion(suggestionId: string) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    const suggestion = itinerary.placeSuggestions[suggestionId];

    if (!suggestion) {
      setStatusMessage("일정에 추가할 장소 제안을 찾을 수 없습니다.");
      return;
    }

    const newItemId = crypto.randomUUID();

    if (
      applyMutation(
        (current) =>
          promotePlaceSuggestion(current, {
            createdBy: currentUserId,
            newItemId,
            suggestionId,
            updatedAt: new Date().toISOString(),
          }),
        `${suggestion.place.name}을 정식 일정에 추가했습니다.`,
      )
    ) {
      setSelectedDayId(suggestion.dayId);
      setSelectedItemId(newItemId);
    }
  }

  function handleRemovePlaceSuggestion(suggestionId: string) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    const suggestion = itinerary.placeSuggestions[suggestionId];

    if (!suggestion) {
      setStatusMessage("삭제할 장소 제안을 찾을 수 없습니다.");
      return;
    }

    applyMutation(
      (current) => removePlaceSuggestion(current, suggestionId),
      `${suggestion.place.name} 후보 장소를 삭제했습니다.`,
    );
  }

  function handleTogglePlaceSuggestionVote(suggestionId: string) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    const suggestion = itinerary.placeSuggestions[suggestionId];

    if (!suggestion) {
      setStatusMessage("투표할 장소 제안을 찾을 수 없습니다.");
      return;
    }

    const hasVoted = Boolean(suggestion.votes[currentUserId]);

    applyMutation(
      (current) =>
        togglePlaceSuggestionVote(current, {
          suggestionId,
          userId: currentUserId,
          votedAt: new Date().toISOString(),
        }),
      hasVoted
        ? `${suggestion.place.name} 후보에서 투표를 취소했습니다.`
        : `${suggestion.place.name} 후보에 투표했습니다.`,
    );
  }

  function handleAddPlaceSuggestionComment(suggestionId: string, body: string) {
    if (!ensureCanEditItinerary()) {
      return false;
    }

    const suggestion = itinerary.placeSuggestions[suggestionId];

    if (!suggestion) {
      setStatusMessage("의견을 남길 장소 제안을 찾을 수 없습니다.");
      return false;
    }

    return applyMutation(
      (current) =>
        addPlaceSuggestionComment(current, {
          comment: {
            body,
            createdAt: new Date().toISOString(),
            createdBy: currentUserId,
            id: crypto.randomUUID(),
          },
          suggestionId,
        }),
      `${suggestion.place.name} 후보에 의견을 남겼습니다.`,
    );
  }

  function handleDeleteConfirm() {
    if (!ensureCanEditItinerary()) {
      return;
    }

    if (!deletingItem) {
      setStatusMessage("삭제할 일정 아이템을 찾을 수 없습니다.");
      return;
    }

    if (
      applyMutation(
        (current) => removeItineraryItem(current, deletingItem.id),
        `${deletingItem.place.name} 일정을 삭제했습니다.`,
      )
    ) {
      if (selectedItemId === deletingItem.id) {
        setSelectedItemId(null);
      }
      setDeleteItemId(null);
    }
  }

  function handleDuplicateItem(itemId: string) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    const item = itinerary.items[itemId];

    if (!item) {
      setStatusMessage("복제할 일정 아이템을 찾을 수 없습니다.");
      return;
    }

    const duplicateItemId = crypto.randomUUID();

    if (
      applyMutation(
        (current) =>
          duplicateItineraryItem(current, {
            createdBy: currentUserId,
            itemId,
            newItemId: duplicateItemId,
            updatedAt: new Date().toISOString(),
          }),
        `${item.place.name} 일정을 복제했습니다.`,
      )
    ) {
      setSelectedItemId(duplicateItemId);
    }
  }

  function handleDuplicateDayItems(destinationDayId: string) {
    if (!ensureCanEditItinerary()) {
      return false;
    }

    if (!selectedDay || selectedDay.itemIds.length === 0) {
      setStatusMessage("복사할 일정이 있는 날짜를 선택해 주세요.");
      return false;
    }

    const destinationDayIndex = itinerary.dayOrder.indexOf(destinationDayId);

    if (destinationDayIndex < 0) {
      setStatusMessage("일정을 복사할 날짜를 찾을 수 없습니다.");
      return false;
    }

    const newItemIds = selectedDay.itemIds.map(() => crypto.randomUUID());
    const firstNewItemId = newItemIds[0];
    const success = applyMutation(
      (current) =>
        duplicateItineraryDayItems(current, {
          createdBy: currentUserId,
          destinationDayId,
          newItemIds,
          sourceDayId: selectedDay.id,
          updatedAt: new Date().toISOString(),
        }),
      `${destinationDayIndex + 1}일차에 일정 ${newItemIds.length}개를 복사했습니다.`,
    );

    if (!success || !firstNewItemId) {
      return false;
    }

    scrollTargetItemIdRef.current = firstNewItemId;
    setSelectedDayId(destinationDayId);
    setSelectedItemId(firstNewItemId);
    setMobileView("itinerary");
    return true;
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    const source = event.operation.source;
    const target = event.operation.target;

    if (!source || typeof source.id !== "string") {
      setStatusMessage("일정 이동을 완료하지 못했습니다.");
      return;
    }

    const itemId = source.id;

    if (event.canceled) {
      setStatusMessage("순서 이동을 취소했습니다.");
      restoreDragHandleFocus(itemId);
      return;
    }

    const item = itinerary.items[itemId];

    if (!item) {
      setStatusMessage("이동할 일정 아이템을 찾을 수 없습니다.");
      restoreDragHandleFocus(itemId);
      return;
    }

    const destinationDayId = getDayIdFromDropTarget(target?.id, itinerary);

    if (destinationDayId && destinationDayId !== item.dayId) {
      const destinationDay = itinerary.days[destinationDayId];
      const destinationDayIndex = itinerary.dayOrder.indexOf(destinationDayId);

      if (
        applyMutation(
          (current) =>
            moveItineraryItem(current, {
              destinationDayId,
              itemId,
              sourceDayId: item.dayId,
              toIndex: destinationDay.itemIds.length,
            }),
          `${item.place.name}을 ${destinationDayIndex + 1}일차 마지막 일정으로 옮겼습니다.`,
        )
      ) {
        setSelectedDayId(destinationDayId);
        setSelectedItemId(itemId);
      }
      restoreDragHandleFocus(itemId);
      return;
    }

    if (destinationDayId === item.dayId) {
      setStatusMessage("이미 이 날짜에 있는 일정입니다.");
      restoreDragHandleFocus(itemId);
      return;
    }

    if (!target || !selectedDay || !isSortable(source) || !isSortable(target)) {
      setStatusMessage("유효한 이동 위치를 찾지 못했습니다.");
      restoreDragHandleFocus(itemId);
      return;
    }

    applyMutation(
      (current) =>
        reorderItineraryItem(current, {
          dayId: item.dayId,
          itemId,
          toIndex: source.index,
        }),
      `${item.place.name}을 ${source.index + 1}번째로 이동했습니다.`,
    );
    restoreDragHandleFocus(itemId);
  }

  function handleMoveItem(itemId: string, toIndex: number) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    if (!selectedDay) {
      setStatusMessage("순서를 변경할 날짜를 찾을 수 없습니다.");
      return;
    }

    const item = itinerary.items[itemId];

    if (!item || item.dayId !== selectedDay.id) {
      setStatusMessage("순서를 변경할 일정 아이템을 찾을 수 없습니다.");
      return;
    }

    applyMutation(
      (current) =>
        reorderItineraryItem(current, {
          dayId: item.dayId,
          itemId,
          toIndex,
        }),
      `${item.place.name}을 ${toIndex + 1}번째로 이동했습니다.`,
    );
  }

  function handleSortItemsByStartTime() {
    if (!ensureCanEditItinerary()) {
      return;
    }

    if (!selectedDay) {
      setStatusMessage("시간순으로 정렬할 날짜를 찾을 수 없습니다.");
      return;
    }

    applyMutation(
      (current) => sortItineraryItemsByStartTime(current, { dayId: selectedDay.id }),
      "입력한 시간 기준으로 일정 순서를 정렬했습니다.",
    );
  }

  function handleMoveToDay(destinationDayId: string, toIndex: number) {
    if (!ensureCanEditItinerary()) {
      return;
    }

    if (!movingItem) {
      setStatusMessage("이동할 일정 아이템을 찾을 수 없습니다.");
      return;
    }

    const destinationDayIndex = itinerary.dayOrder.indexOf(destinationDayId);

    if (
      applyMutation(
        (current) =>
          moveItineraryItem(current, {
            destinationDayId,
            itemId: movingItem.id,
            sourceDayId: movingItem.dayId,
            toIndex,
          }),
        `${movingItem.place.name}을 ${destinationDayIndex + 1}일차로 옮겼습니다.`,
      )
    ) {
      setSelectedDayId(destinationDayId);
      setSelectedItemId(movingItem.id);
      setMoveItemId(null);
    }
  }

  return {
    days,
    currentUserId,
    deletingItem,
    destinationName,
    editingItem,
    handleDeleteConfirm,
    handleDayNoteSubmit,
    handleDragEnd,
    handleDuplicateDayItems,
    handleDuplicateItem,
    handleFormSubmit,
    handleFindItem,
    handleMoveItem,
    handleMoveToDay,
    handlePlaceSuggestionSubmit,
    handleAddPlaceSuggestionComment,
    handlePromotePlaceSuggestion,
    handleRemovePlaceSuggestion,
    handleTogglePlaceSuggestionVote,
    handleSelectDay,
    handleSelectItem,
    handleSortItemsByStartTime,
    itinerary,
    itineraryItems,
    isDuplicateDayDialogOpen,
    isItinerarySearchOpen,
    placeSuggestions,
    mobileView,
    movingItem,
    openAddItemDialog: () => {
      if (ensureCanEditItinerary()) {
        setDialogState({ type: "add" });
      }
    },
    openDeleteDialog: (itemId: string) => {
      if (ensureCanEditItinerary()) {
        setDeleteItemId(itemId);
      }
    },
    openDuplicateDayDialog: () => {
      if (!ensureCanEditItinerary()) {
        return;
      }

      if (!selectedDay || selectedDay.itemIds.length === 0) {
        setStatusMessage("복사할 일정이 있는 날짜를 선택해 주세요.");
        return;
      }

      setIsDuplicateDayDialogOpen(true);
    },
    openEditItemDialog: (itemId: string) => {
      if (ensureCanEditItinerary()) {
        setDialogState({ type: "edit", itemId });
      }
    },
    openMoveDialog: (itemId: string) => {
      if (ensureCanEditItinerary()) {
        setMoveItemId(itemId);
      }
    },
    openItinerarySearch: () => setIsItinerarySearchOpen(true),
    openPlaceSuggestionDialog: () => {
      if (ensureCanEditItinerary()) {
        setIsPlaceSuggestionDialogOpen(true);
      }
    },
    selectedDay,
    selectedDayIndex,
    selectedItemId,
    setMobileView,
    statusMessage,
    trip,
    closeDeleteDialog: () => setDeleteItemId(null),
    closeDuplicateDayDialog: () => setIsDuplicateDayDialogOpen(false),
    closeItemDialog: () => setDialogState({ type: "closed" }),
    closeMoveDialog: () => setMoveItemId(null),
    closeItinerarySearch: () => setIsItinerarySearchOpen(false),
    closePlaceSuggestionDialog: () => setIsPlaceSuggestionDialogOpen(false),
    isItemDialogOpen: dialogState.type !== "closed",
    isPlaceSuggestionDialogOpen,
    itemDialogKey: dialogState.type === "edit" ? dialogState.itemId : "add",
  };
}

export function useItineraryEditor(
  initialTripItinerary: TripItinerary,
  canEditItinerary = true,
) {
  const [tripItinerary, setTripItinerary] = useState(() => initialTripItinerary);
  const [selectedDayId, setSelectedDayId] = useState(
    () => initialTripItinerary.itinerary.dayOrder[0] ?? "",
  );

  return useItineraryEditorController({
    canEditItinerary,
    commitMutation: (mutation) => {
      const result = mutation(tripItinerary);

      if (result.success) {
        setTripItinerary(result.data);
      }

      return result;
    },
    onSelectedDayChange: setSelectedDayId,
    selectedDayId,
    tripItinerary,
  });
}
