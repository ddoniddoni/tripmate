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
  TripDay,
  TripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";
import {
  dayDropTargetPrefix,
  getDayDropTargetId,
  getDragHandleId,
  getTimelineItemId,
} from "@/features/itinerary-editor/model/dnd-targets";
import { useItineraryEditor } from "@/features/itinerary-editor/model/use-itinerary-editor";
import { DeleteItineraryItemDialog } from "@/features/itinerary-editor/ui/delete-itinerary-item-dialog";
import { ItineraryItemDialog } from "@/features/itinerary-editor/ui/itinerary-item-dialog";
import { MoveItineraryItemDialog } from "@/features/itinerary-editor/ui/move-itinerary-item-dialog";
import type { RouteCoordinate } from "@/features/map-sync/model/directions-adapter";
import {
  createMapProjection,
  getSvgPolylinePoints,
} from "@/features/map-sync/model/map-projection";
import { useRoutePreview } from "@/features/map-sync/model/use-route-preview";
import { formatCalendarDate } from "@/shared/lib/calendar-date";

type ItineraryEditorWorkspaceProps = {
  canEditItinerary?: boolean;
  initialTripItinerary: TripItinerary;
};

export type ItineraryEditorController = ReturnType<typeof useItineraryEditor>;

type ItineraryEditorWorkspaceViewProps = {
  canEditItinerary: boolean;
  editor: ItineraryEditorController;
};

type MobileView = "itinerary" | "map";

const markerTones = ["coral", "blue", "green"] as const;

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

function getDayLabel(index: number, dayCount: number) {
  if (index === dayCount - 1) {
    return "마지막 날";
  }

  return ["첫째 날", "둘째 날", "셋째 날"][index] ?? `${index + 1}일차`;
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

type MapArtworkProps = {
  destination: string;
  markers: Array<{
    coordinate: RouteCoordinate;
    id: string;
    isSelected: boolean;
    name: string;
  }>;
  onSelect: (itemId: string) => void;
  routeCoordinates?: readonly RouteCoordinate[];
};

function MapArtwork({ destination, markers, onSelect, routeCoordinates }: MapArtworkProps) {
  const markerNames = markers.map((marker) => marker.name).join(", ");
  const project = createMapProjection(markers.map((marker) => marker.coordinate));
  const routePoints = getSvgPolylinePoints(routeCoordinates ?? [], project);

  return (
    <div
      className="map-artwork"
      role="region"
      aria-label={`${destination} 선택 일정의 지도 미리보기${markerNames ? `: ${markerNames}` : ""}`}
    >
      <svg className="map-roads" viewBox="0 0 720 720" aria-hidden="true">
        <path className="road road-primary" d="M-30 120C115 135 145 230 260 245S500 130 750 178" />
        <path className="road" d="M50-20c20 150 135 220 125 410S90 610 125 760" />
        <path className="road" d="M450-20c-20 145-125 215-100 365s155 195 190 390" />
        <path className="road road-primary" d="M-20 590c140-115 255-70 355-120s160-190 405-185" />
        <path className="road" d="M-20 340c170-10 225 65 335 55s210-120 425-85" />
        {routePoints ? <polyline className="route-line" points={routePoints} /> : null}
      </svg>
      <span className="map-water map-water-one" aria-hidden="true" />
      <span className="map-water map-water-two" aria-hidden="true" />
      <span className="map-park map-park-one" aria-hidden="true" />
      <span className="map-park map-park-two" aria-hidden="true" />

      <span className="map-label label-jeju">제주시</span>
      <span className="map-label label-jocheon">조천읍</span>
      <span className="map-label label-gujwa">구좌읍</span>

      {markers.map((marker, index) => {
        const position = project?.(marker.coordinate);

        return (
          <button
            className={`map-marker${marker.isSelected ? " map-marker-selected" : ""}`}
            key={marker.id}
            type="button"
            aria-label={`${marker.name} 지도에서 선택`}
            aria-pressed={marker.isSelected}
            onClick={() => onSelect(marker.id)}
            style={
              position
                ? { left: `${position.x}%`, top: `${position.y}%` }
                : undefined
            }
          >
            <span>{getMarkerLabel(index)}</span>
          </button>
        );
      })}

      <div className="map-controls" aria-hidden="true">
        <span>+</span>
        <span>−</span>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-route" />오늘의 동선
        </span>
        <span>선택 날짜 기준</span>
      </div>
    </div>
  );
}

type SortableTimelineItemProps = {
  canEditItinerary: boolean;
  dayId: string;
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
};

function SortableTimelineItem({
  canEditItinerary,
  dayId,
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
}: SortableTimelineItemProps) {
  const { handleRef, isDragSource, isDropTarget, ref } = useSortable({
    disabled: !canEditItinerary,
    id: item.id,
    index,
    group: dayId,
  });
  const tone = markerTones[index % markerTones.length];

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
      <article className="place-card">
        <div className="place-card-topline">
          <span className={`place-category category-${tone}`}>
            {item.place.category ?? "장소"}
          </span>
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
        <div className="place-note">
          <span aria-hidden="true">⌁</span>
          {item.note ?? "메모 없음"}
        </div>
      </article>
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
  dayCount: number;
  index: number;
  onSelect: (dayId: string, index: number) => void;
  selectedDayId?: string;
};

function DayDropTarget({
  day,
  dayCount,
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
        <span className="day-label">{getDayLabel(index, dayCount)}</span>
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
            dayCount={days.length}
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
  canEditItinerary: boolean;
  destinationName: string;
  itineraryItems: ItineraryItem[];
  onAdd: () => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onMove: (itemId: string, toIndex: number) => void;
  onMoveToDay: (itemId: string) => void;
  onSelectItem: (itemId: string) => void;
  selectedDay?: TripDay;
  selectedDayIndex: number;
  selectedItemId: string | null;
  statusMessage: string;
  timeZone: string;
};

function TimelinePanel({
  canEditItinerary,
  destinationName,
  itineraryItems,
  onAdd,
  onDelete,
  onDuplicate,
  onEdit,
  onMove,
  onMoveToDay,
  onSelectItem,
  selectedDay,
  selectedDayIndex,
  selectedItemId,
  statusMessage,
  timeZone,
}: TimelinePanelProps) {
  return (
    <section className="timeline-panel" aria-labelledby="timeline-heading">
      <div className="timeline-header">
        <div>
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
        </div>
        {canEditItinerary ? (
          <button className="add-place-placeholder" type="button" onClick={onAdd}>
            <span aria-hidden="true">+</span>
            장소 추가
          </button>
        ) : null}
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
          itineraryItems.map((item, index) => (
            <SortableTimelineItem
              canEditItinerary={canEditItinerary}
              dayId={selectedDay?.id ?? ""}
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
            />
          ))
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
  selectedItemId: string | null;
};

function MapPreviewPanel({
  destinationName,
  itineraryItems,
  onSelectItem,
  selectedItemId,
}: MapPreviewPanelProps) {
  const routePreview = useRoutePreview(itineraryItems);
  const routeMessage = getRoutePreviewMessage(routePreview);

  return (
    <section className="map-panel" aria-label="일정 지도">
      <div className="map-panel-header">
        <div>
          <span className="section-kicker">경로 미리보기</span>
          <h2>오늘의 {destinationName}</h2>
        </div>
        <span className="map-placeholder-action" aria-label="지도 맞춤 기능 준비 중">
          ⌖
        </span>
      </div>
      <MapArtwork
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
        routeCoordinates={routePreview.route?.coordinates}
      />
      <div className={`map-route-status route-status-${routePreview.status}`} role="status">
        <span>{routeMessage}</span>
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
        ? `자동차 · ${formatRouteDistance(routePreview.route.distanceMeters)} · ${formatRouteDuration(routePreview.route.durationSeconds)}`
        : "경로를 불러오지 못했습니다.";
  }
}

type MobileViewSwitchProps = {
  mobileView: MobileView;
  onChange: (view: MobileView) => void;
};

function MobileViewSwitch({ mobileView, onChange }: MobileViewSwitchProps) {
  return (
    <div className="mobile-view-switch" role="group" aria-label="모바일 화면 전환">
      <button
        className={mobileView === "itinerary" ? "mobile-view-active" : undefined}
        type="button"
        aria-pressed={mobileView === "itinerary"}
        onClick={() => onChange("itinerary")}
      >
        일정
      </button>
      <button
        className={mobileView === "map" ? "mobile-view-active" : undefined}
        type="button"
        aria-pressed={mobileView === "map"}
        onClick={() => onChange("map")}
      >
        지도
      </button>
    </div>
  );
}

export function ItineraryEditorWorkspace({
  canEditItinerary = true,
  initialTripItinerary,
}: ItineraryEditorWorkspaceProps) {
  const editor = useItineraryEditor(initialTripItinerary, canEditItinerary);

  return (
    <ItineraryEditorWorkspaceView
      canEditItinerary={canEditItinerary}
      editor={editor}
    />
  );
}

export function ItineraryEditorWorkspaceView({
  canEditItinerary,
  editor,
}: ItineraryEditorWorkspaceViewProps) {

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
          <TimelinePanel
            canEditItinerary={canEditItinerary}
            destinationName={editor.destinationName}
            itineraryItems={editor.itineraryItems}
            onAdd={editor.openAddItemDialog}
            onDelete={editor.openDeleteDialog}
            onDuplicate={editor.handleDuplicateItem}
            onEdit={editor.openEditItemDialog}
            onMove={editor.handleMoveItem}
            onMoveToDay={editor.openMoveDialog}
            onSelectItem={editor.handleSelectItem}
            selectedDay={editor.selectedDay}
            selectedDayIndex={editor.selectedDayIndex}
            selectedItemId={editor.selectedItemId}
            statusMessage={editor.statusMessage}
            timeZone={editor.trip.timeZone}
          />
          <MapPreviewPanel
            destinationName={editor.destinationName}
            itineraryItems={editor.itineraryItems}
            onSelectItem={(itemId) => {
              editor.handleSelectItem(itemId);
              editor.setMobileView("itinerary");
            }}
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

      <MobileViewSwitch mobileView={editor.mobileView} onChange={editor.setMobileView} />

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
    </>
  );
}
