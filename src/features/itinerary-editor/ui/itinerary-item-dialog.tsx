"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";
import { getItineraryScheduleConflicts } from "@/entities/itinerary/model/schedule-conflicts";
import {
  itineraryItemFormSchema,
  type ItineraryItemFormFields,
  type ItineraryItemFormValues,
} from "@/features/itinerary-editor/model/itinerary-item-form";
import { usePlaceSearch } from "@/features/place-search/model/use-place-search";
import { usePlaceDetails } from "@/features/place-search/model/use-place-details";
import { PlacePreviewDialog } from "@/features/place-search/ui/place-preview-dialog";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";
import { TimePicker } from "@/shared/ui/time-picker";

type ItineraryItemDialogProps = {
  item?: ItineraryItem;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ItineraryItemFormValues) => void;
  open: boolean;
  scheduledItems: readonly ItineraryItem[];
};

function getDefaultValues(item?: ItineraryItem): ItineraryItemFormFields {
  return {
    place: item?.place ?? null,
    name: item?.place.name ?? "",
    address: item?.place.address ?? "",
    category: item?.place.category ?? "",
    startTime: item?.startTime ?? "",
    durationMinutes: item?.durationMinutes?.toString() ?? "",
    note: item?.note ?? "",
  };
}

export function ItineraryItemDialog({
  item,
  onOpenChange,
  onSubmit,
  open,
  scheduledItems,
}: ItineraryItemDialogProps) {
  const {
    control,
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<ItineraryItemFormFields>({
    defaultValues: getDefaultValues(item),
    resolver: zodResolver(itineraryItemFormSchema),
  });

  const mode = item ? "edit" : "add";
  const placeSearch = usePlaceSearch();
  const placeDetails = usePlaceDetails();
  const [previewPlace, setPreviewPlace] = useState<PlaceSnapshot | null>(null);
  const startTime = useWatch({ control, name: "startTime" });
  const durationMinutes = useWatch({ control, name: "durationMinutes" });
  const parsedDurationMinutes = Number(durationMinutes);
  const draftId = item?.id ?? "itinerary-form-draft";
  const scheduleConflicts = getItineraryScheduleConflicts([
    ...scheduledItems.filter((scheduledItem) => scheduledItem.id !== item?.id),
    {
      durationMinutes:
        Number.isInteger(parsedDurationMinutes) && parsedDurationMinutes > 0
          ? parsedDurationMinutes
          : undefined,
      id: draftId,
      startTime: startTime || undefined,
    },
  ]);
  const conflictingItemIds = new Set<string>();

  for (const conflict of scheduleConflicts) {
    if (!conflict.itemIds.includes(draftId)) {
      continue;
    }

    for (const itemId of conflict.itemIds) {
      if (itemId !== draftId) {
        conflictingItemIds.add(itemId);
      }
    }
  }

  const conflictingItems = scheduledItems.filter((scheduledItem) =>
    conflictingItemIds.has(scheduledItem.id),
  );

  function handlePlaceSelect(place: PlaceSnapshot) {
    clearErrors("place");
    setValue("place", place, { shouldDirty: true, shouldValidate: true });
    setValue("name", place.name, { shouldDirty: true, shouldValidate: true });
    setValue("address", place.address, { shouldDirty: true, shouldValidate: true });
    setValue("category", place.category ?? "", { shouldDirty: true, shouldValidate: true });
    placeSearch.clear();
    placeDetails.reset();
    setPreviewPlace(null);
  }

  function handleFormSubmit(values: ItineraryItemFormFields) {
    if (!values.place) {
      setError("place", {
        message: "장소 검색 결과에서 장소를 선택해 주세요.",
        type: "required",
      });
      return;
    }

    onSubmit({
      ...values,
      place: {
        ...values.place,
        address: values.address || values.place.address,
        category: values.category || values.place.category,
        name: values.name || values.place.name,
      },
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content itinerary-item-dialog-content"
          aria-describedby="itinerary-dialog-description"
        >
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">{mode === "add" ? "새 일정" : "일정 수정"}</span>
              <Dialog.Title>{mode === "add" ? "장소를 일정에 추가" : item?.place.name}</Dialog.Title>
              <Dialog.Description
                className="dialog-description"
                id="itinerary-dialog-description"
              >
                장소를 검색해 선택하면 바로 추가할 수 있어요. 도착 시간과 메모는 필요할 때만 입력해 주세요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기">
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          <form className="itinerary-form" noValidate onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="place-search form-field-wide">
              <label htmlFor="place-search">장소 검색</label>
              <input
                id="place-search"
                autoComplete="off"
                placeholder="장소명, 주소, 카테고리로 검색"
                value={placeSearch.query}
                onChange={(event) => placeSearch.setQuery(event.target.value)}
              />
              {placeSearch.status === "loading" ? (
                <p role="status">장소를 검색하고 있습니다.</p>
              ) : null}
              {placeSearch.status === "error" ? (
                <p role="alert">{placeSearch.errorMessage}</p>
              ) : null}
              {placeSearch.status === "success" && placeSearch.results.length === 0 ? (
                <p>검색 결과가 없습니다. 장소명이나 주소를 바꿔 다시 검색해 주세요.</p>
              ) : null}
              {placeSearch.results.length > 0 ? (
                <ul className="place-search-results" aria-label="장소 검색 결과">
                  {placeSearch.results.map((place) => (
                    <li key={place.providerPlaceId}>
                      <button
                        type="button"
                        onClick={() => setPreviewPlace(place)}
                        aria-label={`${place.name} 정보 확인`}
                      >
                        <strong>{place.name}</strong>
                        <span>{place.category ?? "장소"}</span>
                        <small>{place.address}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {errors.place ? (
              <p className="form-field-wide" role="alert">
                {errors.place.message}
              </p>
            ) : null}

            <div className="form-field itinerary-item-name-field">
              <label htmlFor="place-name">장소 이름</label>
              <input
                id="place-name"
                autoComplete="off"
                placeholder="장소 검색 결과를 선택해 주세요"
                {...register("name")}
              />
            </div>

            <div className="form-field itinerary-item-address-field">
              <label htmlFor="place-address">주소</label>
              <input
                id="place-address"
                autoComplete="street-address"
                placeholder="장소 검색 결과를 선택해 주세요"
                {...register("address")}
              />
            </div>

            <div className="form-field itinerary-item-category-field">
              <label htmlFor="place-category">카테고리</label>
              <input
                id="place-category"
                autoComplete="off"
                placeholder="장소를 선택하면 표시됩니다"
                {...register("category")}
              />
            </div>

            <fieldset className="form-field time-picker-field itinerary-item-time-field">
              <legend>도착 시간</legend>
              <TimePicker
                aria-describedby={errors.startTime ? "place-start-time-error" : undefined}
                invalid={Boolean(errors.startTime)}
                onChange={(value) =>
                  setValue("startTime", value, { shouldDirty: true, shouldValidate: true })
                }
                value={startTime}
              />
              {errors.startTime ? (
                <span id="place-start-time-error" role="alert">
                  {errors.startTime.message}
                </span>
              ) : null}
            </fieldset>

            <div className="form-field itinerary-item-duration-field">
              <label htmlFor="place-duration">예상 체류 시간</label>
              <input
                id="place-duration"
                aria-describedby={errors.durationMinutes ? "place-duration-error" : undefined}
                aria-invalid={Boolean(errors.durationMinutes)}
                inputMode="numeric"
                min="1"
                max="1440"
                placeholder="분 단위 입력"
                step="5"
                type="number"
                {...register("durationMinutes")}
              />
              {errors.durationMinutes ? (
                <span id="place-duration-error" role="alert">
                  {errors.durationMinutes.message}
                </span>
              ) : null}
            </div>

            {conflictingItems.length > 0 ? (
              <p className="form-field-wide schedule-conflict-notice" role="status">
                <strong>일정 시간이 겹쳐요.</strong>
                <span>
                  {conflictingItems.map((conflictingItem) => conflictingItem.place.name).join(", ")} 일정과
                  겹쳐요. 필요하면 시간을 조정해 주세요.
                </span>
              </p>
            ) : null}

            <div className="form-field form-field-wide">
              <label htmlFor="place-note">메모</label>
              <textarea
                id="place-note"
                aria-describedby={errors.note ? "place-note-error" : undefined}
                aria-invalid={Boolean(errors.note)}
                rows={3}
                {...register("note")}
              />
              {errors.note ? (
                <span id="place-note-error" role="alert">
                  {errors.note.message}
                </span>
              ) : null}
            </div>

            <div className="dialog-actions form-field-wide">
              <Dialog.Close className="secondary-button" type="button">
                취소
              </Dialog.Close>
              <button className="primary-button" type="submit">
                {mode === "add" ? "일정 추가" : "변경 저장"}
              </button>
            </div>
          </form>
          {previewPlace ? (
            <PlacePreviewDialog
              detailsState={placeDetails}
              onLoadDetails={placeDetails.load}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                  placeDetails.reset();
                  setPreviewPlace(null);
                }
              }}
              onSelect={handlePlaceSelect}
              open
              place={previewPlace}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
