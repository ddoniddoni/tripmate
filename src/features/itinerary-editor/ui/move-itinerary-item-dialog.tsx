"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import type {
  ItineraryDocument,
  ItineraryItem,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import { formatCalendarDate } from "@/shared/lib/calendar-date";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";
import { NativeSelect } from "@/shared/ui/native-select";

type MoveItineraryItemDialogProps = {
  days: TripDay[];
  item: ItineraryItem;
  items: ItineraryDocument["items"];
  onMove: (destinationDayId: string, toIndex: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function MoveItineraryItemDialog({
  days,
  item,
  items,
  onMove,
  onOpenChange,
  open,
}: MoveItineraryItemDialogProps) {
  const destinationDays = days.filter((day) => day.id !== item.dayId);
  const [destinationDayId, setDestinationDayId] = useState(destinationDays[0]?.id ?? "");
  const [toIndex, setToIndex] = useState(0);
  const destinationDay = days.find((day) => day.id === destinationDayId);
  const positionItems = destinationDay
    ? destinationDay.itemIds.flatMap((itemId) => {
        const positionItem = items[itemId];
        return positionItem ? [positionItem] : [];
      })
    : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content move-dialog-content">
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">날짜 간 이동</span>
              <Dialog.Title>{item.place.name} 이동</Dialog.Title>
              <Dialog.Description className="dialog-description">
                날짜와 위치를 선택하면 일정 순서가 한 번에 반영됩니다.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기">
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          {destinationDays.length === 0 ? (
            <p className="dialog-description">이동할 다른 날짜가 없습니다.</p>
          ) : (
            <form
              className="itinerary-form move-itinerary-form"
              onSubmit={(event) => {
                event.preventDefault();

                if (!destinationDay) {
                  return;
                }

                onMove(destinationDay.id, toIndex);
              }}
            >
              <div className="form-field form-field-wide">
                <label htmlFor="move-destination-day">이동할 날짜</label>
                <NativeSelect
                  id="move-destination-day"
                  value={destinationDayId}
                  onChange={(event) => {
                    setDestinationDayId(event.target.value);
                    setToIndex(0);
                  }}
                >
                  {destinationDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {formatCalendarDate(day.date, {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="form-field form-field-wide">
                <label htmlFor="move-destination-position">이동할 위치</label>
                <NativeSelect
                  id="move-destination-position"
                  value={toIndex}
                  onChange={(event) => setToIndex(Number(event.target.value))}
                >
                  <option value="0">맨 앞에 놓기</option>
                  {positionItems.map((positionItem, index) => (
                    <option key={positionItem.id} value={index + 1}>
                      {positionItem.place.name} 뒤에 놓기
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="dialog-actions form-field-wide">
                <Dialog.Close className="secondary-button" type="button">
                  취소
                </Dialog.Close>
                <button className="primary-button" type="submit">
                  일정 이동
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
