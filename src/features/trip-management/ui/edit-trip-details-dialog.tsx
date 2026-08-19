"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  updateTripDetailsFormSchema,
  type UpdateTripDetailsInput,
} from "@/entities/trip/model/update-trip-details";
import { updateTripDetails } from "@/features/trip-management/model/update-trip-details-action";
import { initialUpdateTripDetailsActionState } from "@/features/trip-management/model/update-trip-details-action-state";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";
import { HeaderActionIcon } from "@/shared/ui/header-action-icon";

type EditTripDetailsDialogProps = {
  canUpdateTrip: boolean;
  destination: string;
  endDate: string;
  startDate: string;
  title: string;
  tripId: string;
};

type EditTripDetailsFormValues = Omit<UpdateTripDetailsInput, "tripId">;

function toFormData(values: EditTripDetailsFormValues, tripId: string) {
  const formData = new FormData();

  formData.set("destination", values.destination);
  formData.set("endDate", values.endDate);
  formData.set("startDate", values.startDate);
  formData.set("title", values.title);
  formData.set("tripId", tripId);

  return formData;
}

export function EditTripDetailsDialog({
  canUpdateTrip,
  destination,
  endDate,
  startDate,
  title,
  tripId,
}: EditTripDetailsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialUpdateTripDetailsActionState);
  const [isPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<EditTripDetailsFormValues>({
    defaultValues: { destination, endDate, startDate, title },
    resolver: zodResolver(updateTripDetailsFormSchema),
  });

  if (!canUpdateTrip) {
    return null;
  }

  function handleUpdate(values: EditTripDetailsFormValues) {
    startTransition(async () => {
      const nextState = await updateTripDetails(
        initialUpdateTripDetailsActionState,
        toFormData(values, tripId),
      );

      setState(nextState);

      if (nextState.status === "success") {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      reset({ destination, endDate, startDate, title });
      setState(initialUpdateTripDetailsActionState);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger className="trip-details-button" type="button">
        <HeaderActionIcon name="edit" />
        여행 정보 수정
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="edit-trip-details-description">
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">여행 정보</span>
              <Dialog.Title>여행 정보와 기간을 바꿔요</Dialog.Title>
              <Dialog.Description className="dialog-description" id="edit-trip-details-description">
                기간 밖에 일정이 있다면, 일정을 먼저 다른 날짜로 옮겨 주세요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기" disabled={isPending}>
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          <form className="itinerary-form" noValidate onSubmit={handleSubmit(handleUpdate)}>
            <div className="form-field form-field-wide">
              <label htmlFor="edit-trip-title">여행 이름</label>
              <input
                id="edit-trip-title"
                aria-describedby={errors.title ? "edit-trip-title-error" : undefined}
                aria-invalid={Boolean(errors.title)}
                autoComplete="off"
                disabled={isPending}
                {...register("title")}
              />
              {errors.title ? (
                <span id="edit-trip-title-error" role="alert">
                  {errors.title.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="edit-trip-start-date">시작일</label>
              <input
                id="edit-trip-start-date"
                aria-describedby={errors.startDate ? "edit-trip-start-date-error" : undefined}
                aria-invalid={Boolean(errors.startDate)}
                disabled={isPending}
                type="date"
                {...register("startDate")}
              />
              {errors.startDate ? (
                <span id="edit-trip-start-date-error" role="alert">
                  {errors.startDate.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="edit-trip-end-date">종료일</label>
              <input
                id="edit-trip-end-date"
                aria-describedby={errors.endDate ? "edit-trip-end-date-error" : undefined}
                aria-invalid={Boolean(errors.endDate)}
                disabled={isPending}
                type="date"
                {...register("endDate")}
              />
              {errors.endDate ? (
                <span id="edit-trip-end-date-error" role="alert">
                  {errors.endDate.message}
                </span>
              ) : null}
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="edit-trip-destination">여행지</label>
              <input
                id="edit-trip-destination"
                aria-describedby={errors.destination ? "edit-trip-destination-error" : undefined}
                aria-invalid={Boolean(errors.destination)}
                autoComplete="off"
                disabled={isPending}
                {...register("destination")}
              />
              {errors.destination ? (
                <span id="edit-trip-destination-error" role="alert">
                  {errors.destination.message}
                </span>
              ) : null}
            </div>

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
                {isPending ? "저장 중…" : "저장하기"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
