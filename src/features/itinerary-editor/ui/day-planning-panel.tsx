"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type {
  PlaceSuggestion,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import { z } from "@/shared/lib/zod";

const dayMemoFormSchema = z.object({
  note: z.string("메모를 입력해 주세요.").trim().max(2_000, "하루 메모는 2,000자 이내로 입력해 주세요."),
});

type DayMemoFormValues = z.infer<typeof dayMemoFormSchema>;

type DayPlanningPanelProps = {
  canEditItinerary: boolean;
  day?: TripDay;
  onAddSuggestion: () => void;
  onPromoteSuggestion: (suggestionId: string) => void;
  onRemoveSuggestion: (suggestionId: string) => void;
  onSaveDayNote: (note: string) => boolean;
  placeSuggestions: readonly PlaceSuggestion[];
};

function DayMemoForm({
  dayId,
  note,
  onSave,
}: {
  dayId: string;
  note?: string;
  onSave: (note: string) => boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<DayMemoFormValues>({
    defaultValues: { note: note ?? "" },
    resolver: zodResolver(dayMemoFormSchema),
  });
  const inputId = `day-memo-${dayId}`;

  if (!isEditing) {
    return (
      <div className="day-memo-summary">
        <p>{note ?? "아직 메모가 없어요. 함께 정할 내용을 남겨 보세요."}</p>
        <button className="text-action" type="button" onClick={() => setIsEditing(true)}>
          {note ? "메모 수정" : "메모 작성"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="day-memo-form"
      noValidate
      onSubmit={handleSubmit((values) => {
        if (onSave(values.note)) {
          setIsEditing(false);
        }
      })}
    >
      <label htmlFor={inputId}>오늘의 메모</label>
      <textarea
        id={inputId}
        aria-describedby={errors.note ? `${inputId}-error` : undefined}
        aria-invalid={Boolean(errors.note)}
        rows={3}
        {...register("note")}
      />
      {errors.note ? (
        <span id={`${inputId}-error`} role="alert">
          {errors.note.message}
        </span>
      ) : null}
      <div className="day-memo-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            reset({ note: note ?? "" });
            setIsEditing(false);
          }}
        >
          취소
        </button>
        <button className="primary-button" type="submit">
          메모 저장
        </button>
      </div>
    </form>
  );
}

export function DayPlanningPanel({
  canEditItinerary,
  day,
  onAddSuggestion,
  onPromoteSuggestion,
  onRemoveSuggestion,
  onSaveDayNote,
  placeSuggestions,
}: DayPlanningPanelProps) {
  if (!day) {
    return null;
  }

  return (
    <section className="day-planning-panel" aria-labelledby="day-planning-heading">
      <div className="day-planning-heading">
        <div>
          <span className="section-kicker">함께 정리하기</span>
          <h2 id="day-planning-heading">오늘의 메모와 후보 장소</h2>
          <p>바로 넣기 망설여지는 아이디어는 후보로 먼저 모아 두세요.</p>
        </div>
        {canEditItinerary ? (
          <button className="secondary-button day-suggestion-add" type="button" onClick={onAddSuggestion}>
            장소 제안
          </button>
        ) : null}
      </div>

      <div className="day-planning-grid">
        <section className="day-memo-card">
          <span className="day-planning-label">오늘의 메모</span>
          {canEditItinerary ? (
            <DayMemoForm key={day.id} dayId={day.id} note={day.note} onSave={onSaveDayNote} />
          ) : (
            <p className="day-memo-readonly">
              {day.note ?? "아직 메모가 없어요."}
            </p>
          )}
        </section>

        <section className="place-suggestion-card">
          <div className="place-suggestion-heading">
            <span className="day-planning-label">후보 장소</span>
            <span>{placeSuggestions.length}개</span>
          </div>
          {placeSuggestions.length === 0 ? (
            <p className="place-suggestion-empty">
              {canEditItinerary
                ? "가보고 싶은 곳이 있으면 장소 제안으로 남겨 보세요."
                : "아직 공유된 후보 장소가 없어요."}
            </p>
          ) : (
            <ul className="place-suggestion-list">
              {placeSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <article>
                    <span className="place-category category-blue">
                      {suggestion.place.category ?? "장소"}
                    </span>
                    <h3>{suggestion.place.name}</h3>
                    <p>{suggestion.place.address}</p>
                    {suggestion.note ? <blockquote>{suggestion.note}</blockquote> : null}
                    {canEditItinerary ? (
                      <div className="place-suggestion-actions">
                        <button
                          className="text-action"
                          type="button"
                          onClick={() => onPromoteSuggestion(suggestion.id)}
                        >
                          일정에 추가
                        </button>
                        <button
                          className="text-action text-action-danger"
                          type="button"
                          onClick={() => onRemoveSuggestion(suggestion.id)}
                        >
                          제안 삭제
                        </button>
                      </div>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
