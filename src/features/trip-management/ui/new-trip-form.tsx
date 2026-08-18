"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { startTransition, useActionState, useState } from "react";
import { useForm } from "react-hook-form";

import {
  createTripSchema,
  type CreateTripInput,
} from "@/entities/trip/model/create-trip";
import { createTrip } from "@/features/trip-management/model/create-trip-action";
import { initialCreateTripActionState } from "@/features/trip-management/model/create-trip-action-state";

const defaultValues: CreateTripInput = {
  destination: "",
  endDate: "",
  startDate: "",
  timeZone: "Asia/Seoul",
  title: "",
};

function toFormData(values: CreateTripInput) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

export function NewTripForm() {
  const [openAiPlanner, setOpenAiPlanner] = useState(true);
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createTrip,
    initialCreateTripActionState,
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateTripInput>({
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(createTripSchema),
  });

  function handleCreateTrip(values: CreateTripInput) {
    startTransition(() => {
      const formData = toFormData(values);
      formData.set("openAiPlanner", String(openAiPlanner));
      formAction(formData);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="new-trip-card new-trip-trigger" type="button">
        <span className="new-trip-icon" aria-hidden="true">
          +
        </span>
        <strong>새 여행 만들기</strong>
        <span>여행 정보부터 차분히 적어 볼까요?</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content new-trip-dialog-content"
          aria-describedby="create-trip-description"
        >
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">새 여행</span>
              <Dialog.Title>어디로 떠나나요?</Dialog.Title>
              <Dialog.Description className="dialog-description" id="create-trip-description">
                여행의 기본 정보를 저장하고 빈 일정을 바로 시작할 수 있어요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기" disabled={isPending}>
              ×
            </Dialog.Close>
          </div>

          <form className="itinerary-form" noValidate onSubmit={handleSubmit(handleCreateTrip)}>
            <div className="form-field form-field-wide">
              <label htmlFor="trip-title">여행 이름</label>
              <input
                id="trip-title"
                aria-describedby={errors.title ? "trip-title-error" : undefined}
                aria-invalid={Boolean(errors.title)}
                autoComplete="off"
                disabled={isPending}
                placeholder="예: 가을의 부산"
                {...register("title")}
              />
              {errors.title ? (
                <span id="trip-title-error" role="alert">
                  {errors.title.message}
                </span>
              ) : null}
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="trip-destination">여행지</label>
              <input
                id="trip-destination"
                aria-describedby={errors.destination ? "trip-destination-error" : undefined}
                aria-invalid={Boolean(errors.destination)}
                autoComplete="off"
                disabled={isPending}
                placeholder="예: 대한민국 · 부산"
                {...register("destination")}
              />
              {errors.destination ? (
                <span id="trip-destination-error" role="alert">
                  {errors.destination.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="trip-start-date">시작일</label>
              <input
                id="trip-start-date"
                aria-describedby={`trip-start-date-help${
                  errors.startDate ? " trip-start-date-error" : ""
                }`}
                aria-invalid={Boolean(errors.startDate)}
                disabled={isPending}
                type="date"
                {...register("startDate")}
              />
              <span className="form-field-help" id="trip-start-date-help">
                연도는 네 자리로 입력해 주세요.
              </span>
              {errors.startDate ? (
                <span id="trip-start-date-error" role="alert">
                  {errors.startDate.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="trip-end-date">종료일</label>
              <input
                id="trip-end-date"
                aria-describedby={`trip-end-date-help${
                  errors.endDate ? " trip-end-date-error" : ""
                }`}
                aria-invalid={Boolean(errors.endDate)}
                disabled={isPending}
                type="date"
                {...register("endDate")}
              />
              <span className="form-field-help" id="trip-end-date-help">
                연도는 네 자리로 입력해 주세요.
              </span>
              {errors.endDate ? (
                <span id="trip-end-date-error" role="alert">
                  {errors.endDate.message}
                </span>
              ) : null}
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="trip-time-zone">여행 시간대</label>
              <select
                id="trip-time-zone"
                aria-describedby={errors.timeZone ? "trip-time-zone-error" : undefined}
                aria-invalid={Boolean(errors.timeZone)}
                disabled={isPending}
                {...register("timeZone")}
              >
                <option value="Asia/Seoul">대한민국 (Asia/Seoul)</option>
                <option value="Asia/Tokyo">일본 (Asia/Tokyo)</option>
                <option value="Asia/Bangkok">태국 (Asia/Bangkok)</option>
                <option value="Europe/Paris">프랑스 (Europe/Paris)</option>
                <option value="America/Los_Angeles">미국 서부 (America/Los_Angeles)</option>
              </select>
              {errors.timeZone ? (
                <span id="trip-time-zone-error" role="alert">
                  {errors.timeZone.message}
                </span>
              ) : null}
            </div>

            <label className="new-trip-ai-option">
              <input
                checked={openAiPlanner}
                disabled={isPending}
                onChange={(event) => setOpenAiPlanner(event.target.checked)}
                type="checkbox"
              />
              <span aria-hidden="true" className="new-trip-ai-option-mark">
                ✦
              </span>
              <span>
                <strong>여행을 만든 뒤 AI 동선 초안 열기</strong>
                <small>실제 장소를 저장하지 않는 지역별 추천부터 볼 수 있어요.</small>
              </span>
            </label>

            {state.status !== "idle" ? (
              <p
                className={`form-message form-message-${state.status}`}
                role={state.status === "error" ? "alert" : "status"}
              >
                {state.message}
              </p>
            ) : null}

            <div className="dialog-actions form-field-wide">
              <Dialog.Close className="secondary-button" type="button" disabled={isPending}>
                취소
              </Dialog.Close>
              <button className="primary-button" type="submit" disabled={isPending}>
                {isPending ? "여행 만드는 중…" : "여행 만들기"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
