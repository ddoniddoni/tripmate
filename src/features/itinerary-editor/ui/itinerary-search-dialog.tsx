"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useDeferredValue, useState } from "react";

import type { ItineraryDocument } from "@/entities/itinerary/model/trip-itinerary";
import { searchItineraryItems } from "@/entities/itinerary/model/search-itinerary-items";
import { formatCalendarDate } from "@/shared/lib/calendar-date";

type ItinerarySearchDialogProps = {
  itinerary: ItineraryDocument;
  onOpenChange: (open: boolean) => void;
  onSelectItem: (itemId: string) => void;
  open: boolean;
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m12.5 12.5 4 4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

export function ItinerarySearchDialog({
  itinerary,
  onOpenChange,
  onSelectItem,
  open,
}: ItinerarySearchDialogProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = searchItineraryItems(itinerary, deferredQuery);
  const hasQuery = query.trim().length > 0;

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby="itinerary-search-description"
          className="dialog-content itinerary-search-dialog"
        >
          <div className="dialog-heading itinerary-search-heading">
            <div>
              <span className="section-kicker">여행 전체에서</span>
              <Dialog.Title>일정 찾기</Dialog.Title>
              <Dialog.Description
                className="dialog-description"
                id="itinerary-search-description"
              >
                장소명, 주소, 카테고리나 메모를 검색해 해당 일정으로 바로 이동하세요.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="일정 찾기 닫기" className="dialog-close">
              ×
            </Dialog.Close>
          </div>

          <div className="itinerary-search-field">
            <SearchIcon />
            <label className="sr-only" htmlFor="itinerary-search-query">
              전체 일정 검색
            </label>
            <input
              autoComplete="off"
              id="itinerary-search-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 해변, 아침 식사, 서귀포"
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="검색어 지우기"
                className="itinerary-search-clear"
                onClick={() => setQuery("")}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="itinerary-search-result-heading" aria-live="polite">
            <span>{hasQuery ? "검색 결과" : "전체 일정"}</span>
            <strong>{results.length}곳</strong>
          </div>

          {results.length > 0 ? (
            <ol aria-label="일정 검색 결과" className="itinerary-search-results">
              {results.map(({ day, dayIndex, item }) => (
                <li key={item.id}>
                  <button
                    aria-label={`${item.place.name}, ${dayIndex + 1}일차 일정으로 이동`}
                    onClick={() => {
                      onSelectItem(item.id);
                      onOpenChange(false);
                    }}
                    type="button"
                  >
                    <span className="itinerary-search-day" aria-hidden="true">
                      <strong>{dayIndex + 1}</strong>
                      일차
                    </span>
                    <span className="itinerary-search-result-copy">
                      <span>
                        <strong>{item.place.name}</strong>
                        <em>{item.place.category ?? "장소"}</em>
                      </span>
                      <small>
                        {formatCalendarDate(day.date, {
                          day: "numeric",
                          month: "long",
                          weekday: "short",
                        })}
                        {" · "}
                        {item.startTime ?? "시간 미정"}
                      </small>
                      <small>{item.place.address}</small>
                    </span>
                    <span className="itinerary-search-result-arrow">
                      <ArrowIcon />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="itinerary-search-empty">
              <span aria-hidden="true">
                <SearchIcon />
              </span>
              <strong>{hasQuery ? "일치하는 일정이 없어요" : "아직 등록된 일정이 없어요"}</strong>
              <p>
                {hasQuery
                  ? "장소 이름을 짧게 입력하거나 주소와 메모의 다른 단어로 찾아보세요."
                  : "장소를 일정에 추가하면 여기에서 여행 전체를 찾아볼 수 있어요."}
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
