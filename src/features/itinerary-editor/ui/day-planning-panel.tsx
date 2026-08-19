"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  placeSuggestionCommentSchema,
  type PlaceSuggestion,
  type TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import { z } from "@/shared/lib/zod";

const dayMemoFormSchema = z.object({
  note: z.string("메모를 입력해 주세요.").trim().max(2_000, "하루 메모는 2,000자 이내로 입력해 주세요."),
});

type DayMemoFormValues = z.infer<typeof dayMemoFormSchema>;

const placeSuggestionCommentFormSchema = placeSuggestionCommentSchema.pick({ body: true });

type PlaceSuggestionCommentFormValues = z.infer<typeof placeSuggestionCommentFormSchema>;

type DayPlanningPanelProps = {
  canEditItinerary: boolean;
  currentUserId: string;
  day?: TripDay;
  memberLabels: ReadonlyMap<string, string>;
  onAddSuggestionComment: (suggestionId: string, body: string) => boolean;
  onAddSuggestion: () => void;
  onPromoteSuggestion: (suggestionId: string) => void;
  onRemoveSuggestion: (suggestionId: string) => void;
  onSaveDayNote: (note: string) => boolean;
  onToggleSuggestionVote: (suggestionId: string) => void;
  placeSuggestions: readonly PlaceSuggestion[];
};

function HeartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M10 17s-6.5-3.7-6.5-8.4A3.6 3.6 0 0 1 10 6.5a3.6 3.6 0 0 1 6.5 2.1C16.5 13.3 10 17 10 17Z" />
    </svg>
  );
}

function getMemberLabel(
  memberId: string,
  currentUserId: string,
  memberLabels: ReadonlyMap<string, string>,
) {
  if (memberId === currentUserId) {
    return "나";
  }

  return memberLabels.get(memberId) ?? "여행 멤버";
}

function getVoterSummary(
  suggestion: PlaceSuggestion,
  currentUserId: string,
  memberLabels: ReadonlyMap<string, string>,
) {
  const voterIds = Object.keys(suggestion.votes);

  if (voterIds.length === 0) {
    return "첫 투표를 기다리고 있어요.";
  }

  const voterNames = voterIds.map((memberId) =>
    getMemberLabel(memberId, currentUserId, memberLabels),
  );

  if (voterNames.length <= 3) {
    return `${voterNames.join(", ")} · 가고 싶어요`;
  }

  return `${voterNames.slice(0, 2).join(", ")} 외 ${voterNames.length - 2}명 · 가고 싶어요`;
}

function PlaceSuggestionDiscussion({
  canEditItinerary,
  currentUserId,
  memberLabels,
  onAddComment,
  suggestion,
}: {
  canEditItinerary: boolean;
  currentUserId: string;
  memberLabels: ReadonlyMap<string, string>;
  onAddComment: (suggestionId: string, body: string) => boolean;
  suggestion: PlaceSuggestion;
}) {
  const comments = Object.values(suggestion.comments).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<PlaceSuggestionCommentFormValues>({
    defaultValues: { body: "" },
    resolver: zodResolver(placeSuggestionCommentFormSchema),
  });
  const inputId = `place-suggestion-comment-${suggestion.id}`;

  return (
    <details className="place-suggestion-discussion">
      <summary>
        <span>의견</span>
        <strong>{comments.length}</strong>
        <i aria-hidden="true">⌄</i>
      </summary>
      <div className="place-suggestion-discussion-body">
        {comments.length === 0 ? (
          <p className="place-suggestion-comment-empty">
            아직 의견이 없어요. 이 장소에서 하고 싶은 일을 나눠 보세요.
          </p>
        ) : (
          <ol className="place-suggestion-comments">
            {comments.map((comment) => (
              <li key={comment.id}>
                <strong>
                  {getMemberLabel(comment.createdBy, currentUserId, memberLabels)}
                </strong>
                <p>{comment.body}</p>
              </li>
            ))}
          </ol>
        )}
        {canEditItinerary ? (
          <form
            className="place-suggestion-comment-form"
            noValidate
            onSubmit={handleSubmit((values) => {
              if (onAddComment(suggestion.id, values.body)) {
                reset();
              }
            })}
          >
            <label htmlFor={inputId}>{suggestion.place.name}에 의견 남기기</label>
            <div>
              <input
                id={inputId}
                aria-describedby={errors.body ? `${inputId}-error` : undefined}
                aria-invalid={Boolean(errors.body)}
                maxLength={300}
                placeholder="예: 아침 일찍 가면 좋겠어"
                {...register("body")}
              />
              <button type="submit">의견 등록</button>
            </div>
            {errors.body ? (
              <span id={`${inputId}-error`} role="alert">
                {errors.body.message}
              </span>
            ) : null}
          </form>
        ) : null}
      </div>
    </details>
  );
}

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
  currentUserId,
  day,
  memberLabels,
  onAddSuggestionComment,
  onAddSuggestion,
  onPromoteSuggestion,
  onRemoveSuggestion,
  onSaveDayNote,
  onToggleSuggestionVote,
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
          <button className="primary-button day-suggestion-add" type="button" onClick={onAddSuggestion}>
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
              {placeSuggestions.map((suggestion, suggestionIndex) => {
                const hasVoted = Boolean(suggestion.votes[currentUserId]);
                const voteCount = Object.keys(suggestion.votes).length;

                return (
                  <li key={suggestion.id}>
                    <article>
                      <div className="place-suggestion-topline">
                        <div className="place-suggestion-labels">
                          <span className="place-category category-blue">
                            {suggestion.place.category ?? "장소"}
                          </span>
                          {suggestionIndex === 0 && voteCount > 0 ? (
                            <span className="place-suggestion-popular">인기 후보</span>
                          ) : null}
                        </div>
                        {canEditItinerary ? (
                          <button
                            aria-label={`${suggestion.place.name} 좋아요 ${hasVoted ? "취소" : "추가"}`}
                            aria-pressed={hasVoted}
                            className={`place-suggestion-vote${hasVoted ? " is-voted" : ""}`}
                            type="button"
                            onClick={() => onToggleSuggestionVote(suggestion.id)}
                          >
                            <HeartIcon />
                            <span>{voteCount}</span>
                          </button>
                        ) : (
                          <span
                            aria-label={`좋아요 ${voteCount}개`}
                            className="place-suggestion-vote is-readonly"
                          >
                            <HeartIcon />
                            <span>{voteCount}</span>
                          </span>
                        )}
                      </div>
                      <h3>{suggestion.place.name}</h3>
                      <p>{suggestion.place.address}</p>
                      {suggestion.note ? <blockquote>{suggestion.note}</blockquote> : null}
                      <p className="place-suggestion-voters">
                        {getVoterSummary(suggestion, currentUserId, memberLabels)}
                      </p>
                      <PlaceSuggestionDiscussion
                        canEditItinerary={canEditItinerary}
                        currentUserId={currentUserId}
                        memberLabels={memberLabels}
                        onAddComment={onAddSuggestionComment}
                        suggestion={suggestion}
                      />
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
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
