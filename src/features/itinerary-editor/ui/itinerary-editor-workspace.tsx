"use client";

import {
  Accessibility,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/dom";
import {
  DragDropProvider,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";

import type {
  ItineraryItem,
  PlaceSuggestion,
  TripDay,
  TripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";
import { getItineraryScheduleConflicts } from "@/entities/itinerary/model/schedule-conflicts";
import {
  getItineraryTravelBuffers,
  type ItineraryTravelBuffer,
} from "@/entities/itinerary/model/schedule-travel-buffers";
import {
  dayDropTargetPrefix,
  getDayDropTargetId,
  getDragHandleId,
  getTimelineItemId,
} from "@/features/itinerary-editor/model/dnd-targets";
import { useItineraryEditor } from "@/features/itinerary-editor/model/use-itinerary-editor";
import { DeleteItineraryItemDialog } from "@/features/itinerary-editor/ui/delete-itinerary-item-dialog";
import { DayPlanningPanel } from "@/features/itinerary-editor/ui/day-planning-panel";
import { DuplicateItineraryDayDialog } from "@/features/itinerary-editor/ui/duplicate-itinerary-day-dialog";
import { ItinerarySearchDialog } from "@/features/itinerary-editor/ui/itinerary-search-dialog";
import { ItineraryItemDialog } from "@/features/itinerary-editor/ui/itinerary-item-dialog";
import { MoveItineraryItemDialog } from "@/features/itinerary-editor/ui/move-itinerary-item-dialog";
import { PlaceSuggestionDialog } from "@/features/itinerary-editor/ui/place-suggestion-dialog";
import { useRoutePreview } from "@/features/map-sync/model/use-route-preview";
import { GoogleItineraryMap } from "@/features/map-sync/ui/google-itinerary-map";
import { formatCalendarDate } from "@/shared/lib/calendar-date";

type ItineraryEditorWorkspaceProps = {
  canEditItinerary?: boolean;
  initialTripItinerary: TripItinerary;
  memberLabels?: ReadonlyMap<string, string>;
  selectedItemCollaborators?: readonly ItinerarySelectionCollaborator[];
};

export type ItineraryEditorController = ReturnType<typeof useItineraryEditor>;

export type ItinerarySelectionCollaborator = {
  color: string;
  connectionId: number;
  name: string;
  selectedItemId: string;
};

type ItineraryEditorWorkspaceViewProps = {
  canEditItinerary: boolean;
  editor: ItineraryEditorController;
  memberLabels?: ReadonlyMap<string, string>;
  selectedItemCollaborators?: readonly ItinerarySelectionCollaborator[];
};

type MobileView = "itinerary" | "map";

const markerTones = ["coral", "blue", "green"] as const;
const noItinerarySelectionCollaborators: readonly ItinerarySelectionCollaborator[] = [];
const noMemberLabels: ReadonlyMap<string, string> = new Map();

const koreanAccessibility = Accessibility.configure({
  announcements: {
    dragstart({ operation: { source } }: DragStartEvent) {
      return source ? "일정 카드 순서 이동을 시작했습니다." : undefined;
    },
    dragover({ operation: { source, target } }: DragOverEvent) {
      if (!source || !isSortable(source)) {
        return undefined;
      }

      const targetId = target?.id;

      if (typeof targetId === "string" && targetId.startsWith(dayDropTargetPrefix)) {
        return "다른 날짜의 마지막 위치로 이동했습니다.";
      }

      return `${source.index + 1}번째 위치로 이동했습니다.`;
    },
    dragend() {
      return undefined;
    },
  },
  screenReaderInstructions: {
    draggable:
      "순서 이동 버튼에서 스페이스 또는 엔터를 누른 뒤 화살표 키로 이동하세요. 다시 스페이스 또는 엔터를 누르면 놓고, Escape를 누르면 취소합니다.",
  },
});

function getDayLabel(index: number) {
  return `${index + 1}일차`;
}

function formatDuration(durationMinutes?: number) {
  if (!durationMinutes) {
    return "시간 미정";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

function getMarkerLabel(index: number) {
  return index < 26 ? String.fromCharCode("A".charCodeAt(0) + index) : `${index + 1}`;
}

function isCardActionTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("button, a, input, select, textarea") !== null
  );
}

function formatRouteDistance(distanceMeters: number) {
  return `${(distanceMeters / 1_000).toFixed(1)}km`;
}

function formatRouteDuration(durationSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `약 ${minutes}분`;
  }

  return minutes === 0 ? `약 ${hours}시간` : `약 ${hours}시간 ${minutes}분`;
}

function formatTravelBufferMessage(buffer: ItineraryTravelBuffer) {
  if (buffer.status === "not-enough-time") {
    return `자동차 약 ${buffer.requiredMinutes}분 필요 · ${buffer.requiredMinutes - buffer.availableMinutes}분 부족`;
  }

  return `자동차 약 ${buffer.requiredMinutes}분 · ${buffer.availableMinutes - buffer.requiredMinutes}분 여유`;
}

function hasTimeSortOpportunity(items: readonly ItineraryItem[]) {
  let previousValue = -1;

  for (const item of items) {
    const startTimeValue = item.startTime
      ? Number(item.startTime.slice(0, 2)) * 60 + Number(item.startTime.slice(3))
      : Number.POSITIVE_INFINITY;

    if (startTimeValue < previousValue) {
      return true;
    }

    previousValue = startTimeValue;
  }

  return false;
}

function getItinerarySelectionCopy(collaborators: readonly ItinerarySelectionCollaborator[]) {
  const [firstCollaborator] = collaborators;

  if (!firstCollaborator) {
    return null;
  }

  return collaborators.length === 1
    ? `${firstCollaborator.name}님이 이 장소를 확인 중`
    : `${firstCollaborator.name}님 외 ${collaborators.length - 1}명이 이 장소를 확인 중`;
}

function GripIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="6" cy="4" r="1" />
      <circle cx="12" cy="4" r="1" />
      <circle cx="6" cy="9" r="1" />
      <circle cx="12" cy="9" r="1" />
      <circle cx="6" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m12.5 12.5 4 4" />
    </svg>
  );
}

type SortableTimelineItemProps = {
  canEditItinerary: boolean;
  dayId: string;
  hasScheduleConflict: boolean;
  hasTravelTimeShortage: boolean;
  index: number;
  isSelected: boolean;
  item: ItineraryItem;
  itemCount: number;
  onDelete: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onMove: (itemId: string, toIndex: number) => void;
  onMoveToDay: (itemId: string) => void;
  onSelect: (itemId: string) => void;
  selectedItemCollaborators: readonly ItinerarySelectionCollaborator[];
};

function SortableTimelineItem({
  canEditItinerary,
  dayId,
  hasScheduleConflict,
  hasTravelTimeShortage,
  index,
  isSelected,
  item,
  itemCount,
  onDelete,
  onDuplicate,
  onEdit,
  onMove,
  onMoveToDay,
  onSelect,
  selectedItemCollaborators,
}: SortableTimelineItemProps) {
  const { handleRef, isDragSource, isDropTarget, ref } = useSortable({
    disabled: !canEditItinerary,
    id: item.id,
    index,
    group: dayId,
  });
  const tone = markerTones[index % markerTones.length];
  const itinerarySelectionCopy = getItinerarySelectionCopy(selectedItemCollaborators);
  const describedBy = [
    hasScheduleConflict ? `schedule-conflict-${item.id}` : undefined,
    hasTravelTimeShortage ? `travel-buffer-${item.id}` : undefined,
    itinerarySelectionCopy ? `itinerary-selection-${item.id}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={`timeline-item sortable-timeline-item${isDragSource ? " is-dragging" : ""}${isDropTarget ? " is-drop-target" : ""}${isSelected ? " is-selected" : ""}`}
      id={getTimelineItemId(item.id)}
      ref={ref}
    >
      <div className="timeline-time">
        <strong>{item.startTime ?? "미정"}</strong>
        <span>{formatDuration(item.durationMinutes)}</span>
      </div>
      <div className="timeline-track" aria-hidden="true">
        <span className={`track-dot track-${tone}`}>{getMarkerLabel(index)}</span>
        {index < itemCount - 1 ? <i /> : null}
      </div>
      <article
        aria-describedby={describedBy || undefined}
        className="place-card"
        onClick={(event) => {
          if (!isCardActionTarget(event.target)) {
            onSelect(item.id);
          }
        }}
      >
        <div className="place-card-topline">
          <div className="place-card-labels">
            <span className={`place-category category-${tone}`}>
              {item.place.category ?? "장소"}
            </span>
            {hasScheduleConflict ? (
              <span className="schedule-conflict-badge" id={`schedule-conflict-${item.id}`}>
                시간 겹침
              </span>
            ) : null}
            {hasTravelTimeShortage ? <span className="travel-time-badge">이동 촉박</span> : null}
          </div>
          {canEditItinerary ? (
            <div className="place-actions">
              <button
                className="icon-button"
                type="button"
                disabled={index === 0}
                onClick={() => onMove(item.id, index - 1)}
                aria-label={`${item.place.name} 위로 이동`}
              >
                ↑
              </button>
              <button
                className="icon-button"
                type="button"
                disabled={index === itemCount - 1}
                onClick={() => onMove(item.id, index + 1)}
                aria-label={`${item.place.name} 아래로 이동`}
              >
                ↓
              </button>
              <button
                className="icon-button drag-handle"
                id={getDragHandleId(item.id)}
                ref={handleRef}
                type="button"
                aria-describedby="drag-instructions"
                aria-label={`${item.place.name} 순서 이동`}
              >
                <GripIcon />
              </button>
              <button
                className="text-action"
                type="button"
                onClick={() => onMoveToDay(item.id)}
                aria-label={`${item.place.name} 다른 날짜로 이동`}
              >
                이동
              </button>
              <button
                className="text-action"
                type="button"
                onClick={() => onDuplicate(item.id)}
                aria-label={`${item.place.name} 복제`}
              >
                복제
              </button>
              <button
                className="text-action"
                type="button"
                onClick={() => onEdit(item.id)}
                aria-label={`${item.place.name} 수정`}
              >
                수정
              </button>
              <button
                className="text-action text-action-danger"
                type="button"
                onClick={() => onDelete(item.id)}
                aria-label={`${item.place.name} 삭제`}
              >
                삭제
              </button>
            </div>
          ) : null}
        </div>
        <h3>
          <button
            className="place-card-title-button"
            type="button"
            aria-label={`${item.place.name} 선택`}
            aria-pressed={isSelected}
            onClick={() => onSelect(item.id)}
          >
            {item.place.name}
          </button>
        </h3>
        <p className="place-address">{item.place.address}</p>
        {itinerarySelectionCopy ? (
          <div className="itinerary-selection-presence" id={`itinerary-selection-${item.id}`}>
            <span aria-hidden="true" className="itinerary-selection-avatars">
              {selectedItemCollaborators.slice(0, 2).map((collaborator) => (
                <i
                  key={collaborator.connectionId}
                  style={{ backgroundColor: collaborator.color }}
                >
                  {collaborator.name.slice(0, 1)}
                </i>
              ))}
            </span>
            <span>{itinerarySelectionCopy}</span>
          </div>
        ) : null}
        <div className="place-note">
          <span aria-hidden="true">⌁</span>
          {item.note ?? "메모 없음"}
        </div>
      </article>
    </li>
  );
}

function TimelineTravelBuffer({ buffer }: { buffer: ItineraryTravelBuffer }) {
  const isShortage = buffer.status === "not-enough-time";
  const followingItemId = buffer.itemIds[1];

  return (
    <li
      className={`timeline-travel-buffer${isShortage ? " has-not-enough-time" : ""}`}
      id={`travel-buffer-${followingItemId}`}
    >
      <span aria-hidden="true" className="timeline-travel-spacer" />
      <span aria-hidden="true" className="timeline-travel-icon">
        ↗
      </span>
      <p>
        <strong>{isShortage ? "다음 일정 이동 시간이 촉박해요" : "다음 일정까지 이동"}</strong>
        <span>{formatTravelBufferMessage(buffer)}</span>
      </p>
    </li>
  );
}

function DragPreview({ item }: { item: ItineraryItem }) {
  return (
    <article className="place-card drag-preview-card">
      <span className="place-category category-green">순서 이동 중</span>
      <h3>{item.place.name}</h3>
      <p className="place-address">{item.startTime ?? "시간 미정"}</p>
    </article>
  );
}

type DaySidebarProps = {
  days: TripDay[];
  onSelect: (dayId: string, index: number) => void;
  selectedDayId?: string;
  startDate: string;
};

type DayDropTargetProps = {
  day: TripDay;
  index: number;
  onSelect: (dayId: string, index: number) => void;
  selectedDayId?: string;
};

function DayDropTarget({
  day,
  index,
  onSelect,
  selectedDayId,
}: DayDropTargetProps) {
  const { isDropTarget, ref } = useDroppable({
    id: getDayDropTargetId(day.id),
    data: { dayId: day.id },
  });
  const isSelected = day.id === selectedDayId;

  return (
    <li className={isDropTarget ? "is-day-drop-target" : undefined} ref={ref}>
      <button
        className={isSelected ? "day-row day-row-active" : "day-row"}
        type="button"
        aria-current={isSelected ? "date" : undefined}
        onClick={() => onSelect(day.id, index)}
      >
        <span className="day-weekday">
          {formatCalendarDate(day.date, { weekday: "short" })}
        </span>
        <strong>{formatCalendarDate(day.date, { day: "numeric" }).replace("일", "")}</strong>
        <span className="day-label">{getDayLabel(index)}</span>
        {isSelected ? <i className="day-active-dot" aria-hidden="true" /> : null}
      </button>
      {isDropTarget ? <span className="day-drop-hint">여기에 놓기</span> : null}
    </li>
  );
}

function DaySidebar({ days, onSelect, selectedDayId, startDate }: DaySidebarProps) {
  return (
    <aside className="day-sidebar" aria-label="여행 날짜">
      <div className="month-heading">
        <span>{formatCalendarDate(startDate, { month: "long" })}</span>
        <strong>{formatCalendarDate(startDate, { year: "numeric" })}</strong>
      </div>
      <ol className="day-list">
        {days.map((day, index) => (
          <DayDropTarget
            day={day}
            index={index}
            key={day.id}
            onSelect={onSelect}
            selectedDayId={selectedDayId}
          />
        ))}
      </ol>
      <div className="trip-note">
        <span aria-hidden="true">✦</span>
        <p>
          천천히 둘러보는 여행
          <strong>일정 사이 여유를 남겨두었어요.</strong>
        </p>
      </div>
    </aside>
  );
}

type TimelinePanelProps = {
  canDuplicateDay: boolean;
  canEditItinerary: boolean;
  currentUserId: string;
  destinationName: string;
  itineraryItems: ItineraryItem[];
  memberLabels: ReadonlyMap<string, string>;
  placeSuggestions: readonly PlaceSuggestion[];
  onAdd: () => void;
  onAddSuggestionComment: (suggestionId: string, body: string) => boolean;
  onAddSuggestion: () => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onMove: (itemId: string, toIndex: number) => void;
  onMoveToDay: (itemId: string) => void;
  onOpenDuplicateDay: () => void;
  onOpenSearch: () => void;
  onPromoteSuggestion: (suggestionId: string) => void;
  onRemoveSuggestion: (suggestionId: string) => void;
  onSaveDayNote: (note: string) => boolean;
  onSelectItem: (itemId: string) => void;
  onSortByStartTime: () => void;
  onToggleSuggestionVote: (suggestionId: string) => void;
  routePreview: ReturnType<typeof useRoutePreview>;
  selectedItemCollaborators: readonly ItinerarySelectionCollaborator[];
  selectedDay?: TripDay;
  selectedDayIndex: number;
  selectedItemId: string | null;
  statusMessage: string;
  timeZone: string;
};

function TimelinePanel({
  canDuplicateDay,
  canEditItinerary,
  currentUserId,
  destinationName,
  itineraryItems,
  memberLabels,
  placeSuggestions,
  onAdd,
  onAddSuggestionComment,
  onAddSuggestion,
  onDelete,
  onDuplicate,
  onEdit,
  onMove,
  onMoveToDay,
  onOpenDuplicateDay,
  onOpenSearch,
  onPromoteSuggestion,
  onRemoveSuggestion,
  onSaveDayNote,
  onSelectItem,
  onSortByStartTime,
  onToggleSuggestionVote,
  routePreview,
  selectedItemCollaborators,
  selectedDay,
  selectedDayIndex,
  selectedItemId,
  statusMessage,
  timeZone,
}: TimelinePanelProps) {
  const scheduleConflicts = getItineraryScheduleConflicts(itineraryItems);
  const conflictedItemIds = new Set(scheduleConflicts.flatMap((conflict) => conflict.itemIds));
  const travelBuffers =
    routePreview.status === "ready"
      ? getItineraryTravelBuffers(itineraryItems, routePreview.route.legs)
      : [];
  const travelBuffersByFollowingItemId = new Map(
    travelBuffers.map((buffer) => [buffer.itemIds[1], buffer]),
  );
  const collaboratorsBySelectedItemId = new Map<string, ItinerarySelectionCollaborator[]>();

  for (const collaborator of selectedItemCollaborators) {
    const collaborators = collaboratorsBySelectedItemId.get(collaborator.selectedItemId);

    if (collaborators) {
      collaborators.push(collaborator);
    } else {
      collaboratorsBySelectedItemId.set(collaborator.selectedItemId, [collaborator]);
    }
  }

  const canSortByStartTime = hasTimeSortOpportunity(itineraryItems);

  return (
    <section
      className="timeline-panel"
      id="itinerary-timeline-panel"
      aria-labelledby="timeline-heading"
    >
      <div className="timeline-header">
        <div className="timeline-header-copy">
          <span className="section-kicker">
            {selectedDayIndex + 1}일차 ·{" "}
            {selectedDay
              ? formatCalendarDate(selectedDay.date, { weekday: "long" })
              : "날짜 없음"}
          </span>
          <h2 id="timeline-heading">{destinationName} 일정</h2>
          <p>
            일정 {itineraryItems.length}개 · {timeZone}
          </p>
          {conflictedItemIds.size > 0 ? (
            <p className="schedule-conflict-summary" role="status">
              시간이 겹치는 일정 {conflictedItemIds.size}개
            </p>
          ) : null}
        </div>
        <div className="timeline-header-actions">
          <button className="itinerary-search-trigger" type="button" onClick={onOpenSearch}>
            <SearchIcon />
            일정 찾기
          </button>
          {canEditItinerary ? (
            <>
              <button
                className="duplicate-day-trigger"
                disabled={!canDuplicateDay}
                onClick={onOpenDuplicateDay}
                title={
                  canDuplicateDay
                    ? "선택한 날짜의 일정을 다른 날짜로 복사"
                    : "복사할 일정이나 다른 날짜가 없습니다."
                }
                type="button"
              >
                하루 복사
              </button>
              {canSortByStartTime ? (
                <button className="sort-by-time-button" type="button" onClick={onSortByStartTime}>
                  시간순 정렬
                </button>
              ) : null}
              <button className="add-place-placeholder" type="button" onClick={onAdd}>
                <span aria-hidden="true">+</span>
                장소 추가
              </button>
            </>
          ) : null}
        </div>
      </div>

      {canEditItinerary ? (
        <p className="sr-only" id="drag-instructions">
          순서 이동 버튼에서 스페이스 또는 엔터를 누른 뒤 위아래 화살표로 이동하고, 다시
          스페이스 또는 엔터를 눌러 놓습니다. 다른 날짜 버튼에 놓으면 그 날짜 마지막에 추가됩니다.
          취소하려면 Escape를 누르세요. 카드의 위로·아래로·다른 날짜로 이동 버튼으로도 순서를
          바꿀 수 있습니다.
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      <DayPlanningPanel
        canEditItinerary={canEditItinerary}
        currentUserId={currentUserId}
        day={selectedDay}
        memberLabels={memberLabels}
        onAddSuggestionComment={onAddSuggestionComment}
        onAddSuggestion={onAddSuggestion}
        onPromoteSuggestion={onPromoteSuggestion}
        onRemoveSuggestion={onRemoveSuggestion}
        onSaveDayNote={onSaveDayNote}
        onToggleSuggestionVote={onToggleSuggestionVote}
        placeSuggestions={placeSuggestions}
      />

      <ol className="timeline-list">
        {itineraryItems.length === 0 ? (
          <li className="empty-day-state">
            <span aria-hidden="true">＋</span>
            <strong>아직 일정이 없어요</strong>
            <p>
              {canEditItinerary
                ? "장소를 추가해 이 날의 여행을 시작해 보세요."
                : "다른 구성원이 추가한 일정을 여기서 확인할 수 있어요."}
            </p>
          </li>
        ) : (
          itineraryItems.flatMap((item, index) => {
            const travelBuffer = travelBuffersByFollowingItemId.get(item.id);

            return [
              travelBuffer ? <TimelineTravelBuffer buffer={travelBuffer} key={`travel-${item.id}`} /> : null,
              <SortableTimelineItem
                canEditItinerary={canEditItinerary}
                dayId={selectedDay?.id ?? ""}
                hasScheduleConflict={conflictedItemIds.has(item.id)}
                hasTravelTimeShortage={travelBuffer?.status === "not-enough-time"}
                index={index}
                isSelected={item.id === selectedItemId}
                item={item}
                itemCount={itineraryItems.length}
                key={item.id}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onEdit={onEdit}
                onMove={onMove}
                onMoveToDay={onMoveToDay}
                onSelect={onSelectItem}
                selectedItemCollaborators={
                  collaboratorsBySelectedItemId.get(item.id) ?? noItinerarySelectionCollaborators
                }
              />,
            ].filter(Boolean);
          })
        )}
      </ol>

      {itineraryItems.length > 0 ? (
        <div className="timeline-end">
          <span aria-hidden="true">☾</span>
          <div>
            <strong>오늘 일정은 여기까지</strong>
            <p>숙소에서 다음 날을 준비해요.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type MapPreviewPanelProps = {
  destinationName: string;
  itineraryItems: ItineraryItem[];
  onSelectItem: (itemId: string) => void;
  routePreview: ReturnType<typeof useRoutePreview>;
  selectedItemId: string | null;
};

function MapPreviewPanel({
  destinationName,
  itineraryItems,
  onSelectItem,
  routePreview,
  selectedItemId,
}: MapPreviewPanelProps) {
  const routeMessage = getRoutePreviewMessage(routePreview);

  return (
    <section className="map-panel" id="itinerary-map-panel" aria-labelledby="map-panel-heading">
      <div className="map-panel-header">
        <div>
          <span className="section-kicker">경로 미리보기</span>
          <h2 id="map-panel-heading">오늘의 {destinationName}</h2>
        </div>
        <span className="map-live-badge">실제 지도</span>
      </div>
      <GoogleItineraryMap
        destination={destinationName}
        markers={itineraryItems.map((item) => ({
          coordinate: {
            longitude: item.place.longitude,
            latitude: item.place.latitude,
          },
          id: item.id,
          isSelected: item.id === selectedItemId,
          name: item.place.name,
        }))}
        onSelect={onSelectItem}
        routeCoordinates={
          routePreview.status === "ready" ? routePreview.route.coordinates : undefined
        }
      />
      <div className={`map-route-status route-status-${routePreview.status}`} role="status">
        <div>
          <span>{routeMessage}</span>
          {routePreview.status === "ready" && routePreview.route?.legs.length ? (
            <ol className="map-route-legs" aria-label="장소 사이 자동차 이동 시간">
              {routePreview.route.legs.map((leg, index) => {
                const fromItem = itineraryItems[index];
                const toItem = itineraryItems[index + 1];

                if (!fromItem || !toItem) {
                  return null;
                }

                return (
                  <li key={`${fromItem.id}-${toItem.id}`}>
                    <span>
                      {fromItem.place.name} → {toItem.place.name}
                    </span>
                    <strong>
                      {formatRouteDuration(leg.durationSeconds)} · {formatRouteDistance(leg.distanceMeters)}
                    </strong>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
        {routePreview.status === "error" ? (
          <button type="button" onClick={routePreview.retry}>
            경로 다시 시도
          </button>
        ) : null}
      </div>
    </section>
  );
}

function getRoutePreviewMessage(routePreview: ReturnType<typeof useRoutePreview>) {
  switch (routePreview.status) {
    case "empty":
      return "경유지가 없어요.";
    case "one-point":
      return "장소를 하나 더 추가하면 경로를 보여 드려요.";
    case "too-many-points":
      return `실제 이동 경로는 하루 ${routePreview.maximumCoordinateCount}곳까지 계산할 수 있어요.`;
    case "missing-points":
      return "일부 장소의 좌표가 없어 경로를 계산할 수 없어요.";
    case "loading":
      return "경로를 계산하는 중이에요…";
    case "no-route":
      return "연결 가능한 경로를 찾지 못했어요.";
    case "error":
      return routePreview.errorMessage ?? "경로를 불러오지 못했습니다.";
    case "ready":
      return routePreview.route
        ? `자동차 이동 · ${formatRouteDistance(routePreview.route.distanceMeters)} · 약 ${formatRouteDuration(routePreview.route.durationSeconds)}`
        : "경로를 불러오지 못했습니다.";
  }
}

type MobileViewSwitchProps = {
  mobileView: MobileView;
  onChange: (view: MobileView) => void;
};

function MobileViewSwitch({ mobileView, onChange }: MobileViewSwitchProps) {
  return (
    <>
      <p className="sr-only" id="mobile-view-switch-description">
        작은 화면에서는 일정과 지도를 한 화면씩 확인합니다. 지도에서 장소를 선택하면 일정으로
        돌아갑니다.
      </p>
      <div
        className="mobile-view-switch"
        role="group"
        aria-describedby="mobile-view-switch-description"
        aria-label="모바일 화면 전환"
      >
        <button
          className={mobileView === "itinerary" ? "mobile-view-active" : undefined}
          type="button"
          aria-controls="itinerary-timeline-panel"
          aria-pressed={mobileView === "itinerary"}
          onClick={() => onChange("itinerary")}
        >
          일정
        </button>
        <button
          className={mobileView === "map" ? "mobile-view-active" : undefined}
          type="button"
          aria-controls="itinerary-map-panel"
          aria-pressed={mobileView === "map"}
          onClick={() => onChange("map")}
        >
          지도
        </button>
      </div>
    </>
  );
}

export function ItineraryEditorWorkspace({
  canEditItinerary = true,
  initialTripItinerary,
  memberLabels = noMemberLabels,
  selectedItemCollaborators = noItinerarySelectionCollaborators,
}: ItineraryEditorWorkspaceProps) {
  const editor = useItineraryEditor(initialTripItinerary, canEditItinerary);

  return (
    <ItineraryEditorWorkspaceView
      canEditItinerary={canEditItinerary}
      editor={editor}
      memberLabels={memberLabels}
      selectedItemCollaborators={selectedItemCollaborators}
    />
  );
}

export function ItineraryEditorWorkspaceView({
  canEditItinerary,
  editor,
  memberLabels = noMemberLabels,
  selectedItemCollaborators = noItinerarySelectionCollaborators,
}: ItineraryEditorWorkspaceViewProps) {
  const routePreview = useRoutePreview(editor.itineraryItems);

  return (
    <>
      <DragDropProvider
        onDragEnd={editor.handleDragEnd}
        plugins={(defaults) => [
          ...defaults.filter((plugin) => {
            if (plugin === Accessibility) {
              return false;
            }

            return typeof plugin === "function" || plugin.plugin !== Accessibility;
          }),
          koreanAccessibility,
        ]}
      >
        <div
          className={`editor-layout ${editor.mobileView === "map" ? "mobile-map-view" : "mobile-itinerary-view"}`}
        >
          <DaySidebar
            days={editor.days}
            onSelect={editor.handleSelectDay}
            selectedDayId={editor.selectedDay?.id}
            startDate={editor.trip.startDate}
          />
          <MobileViewSwitch mobileView={editor.mobileView} onChange={editor.setMobileView} />
          <TimelinePanel
            canDuplicateDay={
              Boolean(editor.selectedDay?.itemIds.length) && editor.days.length > 1
            }
            canEditItinerary={canEditItinerary}
            currentUserId={editor.currentUserId}
            destinationName={editor.destinationName}
            itineraryItems={editor.itineraryItems}
            memberLabels={memberLabels}
            onAdd={editor.openAddItemDialog}
            onAddSuggestionComment={editor.handleAddPlaceSuggestionComment}
            onAddSuggestion={editor.openPlaceSuggestionDialog}
            onDelete={editor.openDeleteDialog}
            onDuplicate={editor.handleDuplicateItem}
            onEdit={editor.openEditItemDialog}
            onMove={editor.handleMoveItem}
            onMoveToDay={editor.openMoveDialog}
            onOpenDuplicateDay={editor.openDuplicateDayDialog}
            onOpenSearch={editor.openItinerarySearch}
            onPromoteSuggestion={editor.handlePromotePlaceSuggestion}
            onRemoveSuggestion={editor.handleRemovePlaceSuggestion}
            onSaveDayNote={editor.handleDayNoteSubmit}
            onSelectItem={editor.handleSelectItem}
            onSortByStartTime={editor.handleSortItemsByStartTime}
            onToggleSuggestionVote={editor.handleTogglePlaceSuggestionVote}
            routePreview={routePreview}
            selectedItemCollaborators={selectedItemCollaborators}
            selectedDay={editor.selectedDay}
            selectedDayIndex={editor.selectedDayIndex}
            selectedItemId={editor.selectedItemId}
            statusMessage={editor.statusMessage}
            timeZone={editor.trip.timeZone}
            placeSuggestions={editor.placeSuggestions}
          />
          <MapPreviewPanel
            destinationName={editor.destinationName}
            itineraryItems={editor.itineraryItems}
            onSelectItem={(itemId) => {
              editor.handleSelectItem(itemId);
              editor.setMobileView("itinerary");
            }}
            routePreview={routePreview}
            selectedItemId={editor.selectedItemId}
          />
        </div>

        <DragOverlay dropAnimation={null} className="drag-overlay">
          {(source) => {
            const item = editor.itinerary.items[String(source.id)];
            return item ? <DragPreview item={item} /> : null;
          }}
        </DragOverlay>
      </DragDropProvider>

      {editor.isItemDialogOpen ? (
        <ItineraryItemDialog
          item={editor.editingItem}
          key={editor.itemDialogKey}
          open
          onOpenChange={(open) => {
            if (!open) {
              editor.closeItemDialog();
            }
          }}
          onSubmit={editor.handleFormSubmit}
          scheduledItems={editor.itineraryItems}
        />
      ) : null}

      {editor.isDuplicateDayDialogOpen && editor.selectedDay ? (
        <DuplicateItineraryDayDialog
          days={editor.days}
          key={editor.selectedDay.id}
          onDuplicate={editor.handleDuplicateDayItems}
          onOpenChange={(open) => {
            if (!open) {
              editor.closeDuplicateDayDialog();
            }
          }}
          open
          sourceDay={editor.selectedDay}
          sourceItems={editor.itineraryItems}
        />
      ) : null}

      {editor.isItinerarySearchOpen ? (
        <ItinerarySearchDialog
          itinerary={editor.itinerary}
          onOpenChange={(open) => {
            if (!open) {
              editor.closeItinerarySearch();
            }
          }}
          onSelectItem={editor.handleFindItem}
          open
        />
      ) : null}

      {editor.deletingItem ? (
        <DeleteItineraryItemDialog
          itemName={editor.deletingItem.place.name}
          open
          onOpenChange={(open) => {
            if (!open) {
              editor.closeDeleteDialog();
            }
          }}
          onConfirm={editor.handleDeleteConfirm}
        />
      ) : null}

      {editor.movingItem ? (
        <MoveItineraryItemDialog
          days={editor.days}
          item={editor.movingItem}
          items={editor.itinerary.items}
          key={editor.movingItem.id}
          open
          onMove={editor.handleMoveToDay}
          onOpenChange={(open) => {
            if (!open) {
              editor.closeMoveDialog();
            }
          }}
        />
      ) : null}

      {editor.isPlaceSuggestionDialogOpen ? (
        <PlaceSuggestionDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              editor.closePlaceSuggestionDialog();
            }
          }}
          onSubmit={editor.handlePlaceSuggestionSubmit}
        />
      ) : null}
    </>
  );
}
