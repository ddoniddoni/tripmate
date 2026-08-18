"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import type {
  ItineraryItem,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import { formatCalendarDate } from "@/shared/lib/calendar-date";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";

type DuplicateItineraryDayDialogProps = {
  days: readonly TripDay[];
  onDuplicate: (destinationDayId: string) => boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceDay: TripDay;
  sourceItems: readonly ItineraryItem[];
};

function CopyDayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="12" rx="2" width="12" x="8" y="8" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function DuplicateItineraryDayDialog({
  days,
  onDuplicate,
  onOpenChange,
  open,
  sourceDay,
  sourceItems,
}: DuplicateItineraryDayDialogProps) {
  const sourceDayIndex = days.findIndex((day) => day.id === sourceDay.id);
  const destinationDays = days.filter((day) => day.id !== sourceDay.id);
  const [destinationDayId, setDestinationDayId] = useState(destinationDays[0]?.id ?? "");

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby="duplicate-day-description"
          className="dialog-content duplicate-day-dialog"
        >
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">하루를 그대로</span>
              <Dialog.Title>{sourceDayIndex + 1}일차 일정을 복사할까요?</Dialog.Title>
              <Dialog.Description
                className="dialog-description"
                id="duplicate-day-description"
              >
                장소와 시간, 소요 시간, 메모를 선택한 날짜의 기존 일정 뒤에 추가합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="하루 일정 복사 닫기" className="dialog-close">
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          <form
            className="duplicate-day-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (destinationDayId && onDuplicate(destinationDayId)) {
                onOpenChange(false);
              }
            }}
          >
            <section className="duplicate-day-source" aria-label="복사할 일정 요약">
              <span className="duplicate-day-source-icon">
                <CopyDayIcon />
              </span>
              <div>
                <span>
                  {formatCalendarDate(sourceDay.date, {
                    day: "numeric",
                    month: "long",
                    weekday: "short",
                  })}
                </span>
                <strong>일정 {sourceItems.length}개를 복사해요</strong>
                <p>{sourceItems.map((item) => item.place.name).join(" · ")}</p>
              </div>
            </section>

            {destinationDays.length > 0 ? (
              <fieldset className="duplicate-day-destinations">
                <legend>복사할 날짜</legend>
                <div>
                  {destinationDays.map((day) => {
                    const dayIndex = days.findIndex((candidate) => candidate.id === day.id);
                    const isSelected = destinationDayId === day.id;

                    return (
                      <label className={isSelected ? "is-selected" : undefined} key={day.id}>
                        <input
                          checked={isSelected}
                          name="duplicate-day-destination"
                          onChange={() => setDestinationDayId(day.id)}
                          type="radio"
                          value={day.id}
                        />
                        <span className="duplicate-day-number">
                          <strong>{dayIndex + 1}</strong>
                          일차
                        </span>
                        <span className="duplicate-day-date">
                          <strong>
                            {formatCalendarDate(day.date, {
                              day: "numeric",
                              month: "long",
                              weekday: "short",
                            })}
                          </strong>
                          <small>
                            {day.itemIds.length > 0
                              ? `기존 일정 ${day.itemIds.length}개 뒤에 추가`
                              : "비어 있는 날짜"}
                          </small>
                        </span>
                        <i aria-hidden="true" />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="duplicate-day-empty">복사할 다른 날짜가 없습니다.</p>
            )}

            <p className="duplicate-day-guidance">
              원본 일정과 하루 메모, 후보 장소는 그대로 유지됩니다.
            </p>

            <div className="dialog-actions">
              <Dialog.Close className="secondary-button" type="button">
                취소
              </Dialog.Close>
              <button className="primary-button" disabled={!destinationDayId} type="submit">
                {sourceItems.length}개 일정 복사
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
