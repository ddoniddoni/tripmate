"use client";

import { type DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import {
  addItineraryItem,
  duplicateItineraryItem,
  moveItineraryItem,
  removeItineraryItem,
  reorderItineraryItem,
  updateItineraryItem,
  type ItineraryMutationResult,
} from "@/entities/itinerary/model/mutations";
import { selectItemsForDay, selectOrderedDays } from "@/entities/itinerary/model/selectors";
import type { TripItinerary } from "@/entities/itinerary/model/trip-itinerary";
import {
  getDayIdFromDropTarget,
  getDragHandleId,
  getTimelineItemId,
} from "@/features/itinerary-editor/model/dnd-targets";
import type { ItineraryItemFormValues } from "@/features/itinerary-editor/model/itinerary-item-form";

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
  tripItinerary: TripItinerary;
};

export function useItineraryEditorController({
  canEditItinerary = true,
  commitMutation,
  currentUserId = "user-jiwoo",
  initialStatusMessage = "로컬 편집을 시작할 수 있습니다.",
  tripItinerary,
}: UseItineraryEditorControllerOptions) {
  const [selectedDayId, setSelectedDayId] = useState(
    () => tripItinerary.itinerary.dayOrder[0] ?? "",
  );
  const [dialogState, setDialogState] = useState<EditorDialogState>({ type: "closed" });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("itinerary");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);

  const { trip, itinerary } = tripItinerary;
  const days = selectOrderedDays(itinerary);
  const selectedDay = itinerary.days[selectedDayId] ?? days[0];
  const itineraryItems = selectedDay ? selectItemsForDay(itinerary, selectedDay.id) : [];
  const destinationName = trip.destination.split("·").at(-1)?.trim() ?? trip.destination;
  const editingItem =
    dialogState.type === "edit" ? itinerary.items[dialogState.itemId] : undefined;
  const deletingItem = deleteItemId ? itinerary.items[deleteItemId] : undefined;
  const movingItem = moveItemId ? itinerary.items[moveItemId] : undefined;
  const selectedDayIndex = selectedDay ? itinerary.dayOrder.indexOf(selectedDay.id) : -1;

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
    deletingItem,
    destinationName,
    editingItem,
    handleDeleteConfirm,
    handleDragEnd,
    handleDuplicateItem,
    handleFormSubmit,
    handleMoveItem,
    handleMoveToDay,
    handleSelectDay,
    handleSelectItem,
    itinerary,
    itineraryItems,
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
    selectedDay,
    selectedDayIndex,
    selectedItemId,
    setMobileView,
    statusMessage,
    trip,
    closeDeleteDialog: () => setDeleteItemId(null),
    closeItemDialog: () => setDialogState({ type: "closed" }),
    closeMoveDialog: () => setMoveItemId(null),
    isItemDialogOpen: dialogState.type !== "closed",
    itemDialogKey: dialogState.type === "edit" ? dialogState.itemId : "add",
  };
}

export function useItineraryEditor(
  initialTripItinerary: TripItinerary,
  canEditItinerary = true,
) {
  const [tripItinerary, setTripItinerary] = useState(() => initialTripItinerary);

  return useItineraryEditorController({
    canEditItinerary,
    commitMutation: (mutation) => {
      const result = mutation(tripItinerary);

      if (result.success) {
        setTripItinerary(result.data);
      }

      return result;
    },
    tripItinerary,
  });
}
