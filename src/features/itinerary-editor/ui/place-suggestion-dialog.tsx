"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm, useWatch } from "react-hook-form";

import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import {
  placeSuggestionFormSchema,
  type PlaceSuggestionFormFields,
  type PlaceSuggestionFormValues,
} from "@/features/itinerary-editor/model/place-suggestion-form";
import { usePlaceSearch } from "@/features/place-search/model/use-place-search";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";

type PlaceSuggestionDialogProps = {
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PlaceSuggestionFormValues) => void;
  open: boolean;
};

export function PlaceSuggestionDialog({
  onOpenChange,
  onSubmit,
  open,
}: PlaceSuggestionDialogProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setValue,
    clearErrors,
  } = useForm<PlaceSuggestionFormFields>({
    defaultValues: { note: "", place: null },
    resolver: zodResolver(placeSuggestionFormSchema),
  });
  const selectedPlace = useWatch({ control, name: "place" });
  const placeSearch = usePlaceSearch();

  function handlePlaceSelect(place: PlaceSnapshot) {
    clearErrors("place");
    setValue("place", place, { shouldDirty: true, shouldValidate: true });
    placeSearch.clear();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content place-suggestion-dialog" aria-describedby="place-suggestion-description">
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">후보 장소</span>
              <Dialog.Title>이런 곳도 있어요</Dialog.Title>
              <Dialog.Description className="dialog-description" id="place-suggestion-description">
                확정 전 장소를 동행에게 공유해 보세요. 일정에 추가하기 전까지 지도와 경로에는 포함되지 않아요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기">
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          <form
            className="place-suggestion-form"
            noValidate
            onSubmit={handleSubmit((values) => {
              if (!values.place) {
                setError("place", {
                  message: "장소 검색 결과에서 장소를 선택해 주세요.",
                  type: "required",
                });
                return;
              }

              onSubmit({ note: values.note, place: values.place });
            })}
          >
            <div className="place-search form-field-wide">
              <label htmlFor="place-suggestion-search">장소 검색</label>
              <input
                id="place-suggestion-search"
                autoComplete="off"
                placeholder="장소명, 주소, 카테고리로 검색"
                value={placeSearch.query}
                onChange={(event) => placeSearch.setQuery(event.target.value)}
              />
              <p>두 글자 이상 입력하면 후보 장소를 찾아 드립니다.</p>
              {placeSearch.status === "loading" ? <p role="status">장소를 검색하고 있습니다.</p> : null}
              {placeSearch.status === "error" ? <p role="alert">{placeSearch.errorMessage}</p> : null}
              {placeSearch.status === "success" && placeSearch.results.length === 0 ? (
                <p>검색 결과가 없습니다. 장소명이나 주소를 바꿔 다시 검색해 주세요.</p>
              ) : null}
              {placeSearch.results.length > 0 ? (
                <ul className="place-search-results" aria-label="장소 검색 결과">
                  {placeSearch.results.map((place) => (
                    <li key={place.providerPlaceId}>
                      <button
                        type="button"
                        onClick={() => handlePlaceSelect(place)}
                        aria-label={`${place.name} 후보 장소로 선택`}
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

            {selectedPlace ? (
              <p className="place-suggestion-selection" role="status">
                <strong>{selectedPlace.name}</strong>
                <span>{selectedPlace.address}</span>
              </p>
            ) : null}
            {errors.place ? <p className="form-field-wide" role="alert">{errors.place.message}</p> : null}

            <div className="form-field form-field-wide">
              <label htmlFor="place-suggestion-note">제안 메모</label>
              <textarea
                id="place-suggestion-note"
                aria-describedby={errors.note ? "place-suggestion-note-error" : undefined}
                aria-invalid={Boolean(errors.note)}
                placeholder="예: 일몰 보기 좋다던데, 시간 되면 들러 보자"
                rows={3}
                {...register("note")}
              />
              {errors.note ? (
                <span id="place-suggestion-note-error" role="alert">
                  {errors.note.message}
                </span>
              ) : null}
            </div>

            <div className="dialog-actions form-field-wide">
              <Dialog.Close className="secondary-button" type="button">
                취소
              </Dialog.Close>
              <button className="primary-button" type="submit">
                후보 장소 저장
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
