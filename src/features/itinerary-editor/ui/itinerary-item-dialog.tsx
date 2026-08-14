"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";

import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";
import {
  itineraryItemFormSchema,
  type ItineraryItemFormValues,
} from "@/features/itinerary-editor/model/itinerary-item-form";
import { usePlaceSearch } from "@/features/place-search/model/use-place-search";

type ItineraryItemDialogProps = {
  item?: ItineraryItem;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ItineraryItemFormValues) => void;
  open: boolean;
};

function getDefaultValues(item?: ItineraryItem): ItineraryItemFormValues {
  return {
    name: item?.place.name ?? "",
    address: item?.place.address ?? "",
    category: item?.place.category ?? "",
    startTime: item?.startTime ?? "",
    durationMinutes: item?.durationMinutes?.toString() ?? "",
    note: item?.note ?? "",
    longitude: item?.place.longitude.toString() ?? "126.5312",
    latitude: item?.place.latitude.toString() ?? "33.4996",
  };
}

export function ItineraryItemDialog({
  item,
  onOpenChange,
  onSubmit,
  open,
}: ItineraryItemDialogProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<ItineraryItemFormValues>({
    defaultValues: getDefaultValues(item),
    resolver: zodResolver(itineraryItemFormSchema),
  });

  const mode = item ? "edit" : "add";
  const placeSearch = usePlaceSearch();

  function handlePlaceSelect(place: PlaceSnapshot) {
    setValue("name", place.name, { shouldDirty: true, shouldValidate: true });
    setValue("address", place.address, { shouldDirty: true, shouldValidate: true });
    setValue("category", place.category ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("longitude", place.longitude.toString(), { shouldDirty: true, shouldValidate: true });
    setValue("latitude", place.latitude.toString(), { shouldDirty: true, shouldValidate: true });
    placeSearch.clear();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="itinerary-dialog-description">
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">{mode === "add" ? "새 일정" : "일정 수정"}</span>
              <Dialog.Title>{mode === "add" ? "장소를 일정에 추가" : item?.place.name}</Dialog.Title>
              <Dialog.Description
                className="dialog-description"
                id="itinerary-dialog-description"
              >
                장소 정보와 방문 시간을 입력해 주세요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기">
              ×
            </Dialog.Close>
          </div>

          <form className="itinerary-form" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="place-search form-field-wide">
              <label htmlFor="place-search">장소 검색</label>
              <input
                id="place-search"
                autoComplete="off"
                placeholder="장소명, 주소, 카테고리로 검색"
                value={placeSearch.query}
                onChange={(event) => placeSearch.setQuery(event.target.value)}
              />
              {placeSearch.query.trim().length === 1 ? (
                <p>두 글자 이상 입력하면 제주 mock 장소를 검색합니다.</p>
              ) : null}
              {placeSearch.status === "loading" ? (
                <p role="status">장소를 검색하고 있습니다.</p>
              ) : null}
              {placeSearch.status === "error" ? (
                <p role="alert">장소 검색을 완료하지 못했습니다. 다시 시도해 주세요.</p>
              ) : null}
              {placeSearch.status === "success" && placeSearch.results.length === 0 ? (
                <p>검색 결과가 없습니다. 직접 장소 정보를 입력할 수 있습니다.</p>
              ) : null}
              {placeSearch.results.length > 0 ? (
                <ul className="place-search-results" aria-label="장소 검색 결과">
                  {placeSearch.results.map((place) => (
                    <li key={place.providerPlaceId}>
                      <button
                        type="button"
                        onClick={() => handlePlaceSelect(place)}
                        aria-label={`${place.name} 선택`}
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

            <div className="form-field form-field-wide">
              <label htmlFor="place-name">장소 이름</label>
              <input
                id="place-name"
                aria-describedby={errors.name ? "place-name-error" : undefined}
                aria-invalid={Boolean(errors.name)}
                autoComplete="off"
                {...register("name")}
              />
              {errors.name ? (
                <span id="place-name-error" role="alert">
                  {errors.name.message}
                </span>
              ) : null}
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="place-address">주소</label>
              <input
                id="place-address"
                aria-describedby={errors.address ? "place-address-error" : undefined}
                aria-invalid={Boolean(errors.address)}
                autoComplete="street-address"
                {...register("address")}
              />
              {errors.address ? (
                <span id="place-address-error" role="alert">
                  {errors.address.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="place-category">카테고리</label>
              <input
                id="place-category"
                aria-describedby={errors.category ? "place-category-error" : undefined}
                aria-invalid={Boolean(errors.category)}
                autoComplete="off"
                {...register("category")}
              />
              {errors.category ? (
                <span id="place-category-error" role="alert">
                  {errors.category.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="place-start-time">시작 시간</label>
              <input
                id="place-start-time"
                aria-describedby={errors.startTime ? "place-start-time-error" : undefined}
                aria-invalid={Boolean(errors.startTime)}
                type="time"
                {...register("startTime")}
              />
              {errors.startTime ? (
                <span id="place-start-time-error" role="alert">
                  {errors.startTime.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="place-duration">소요 시간(분)</label>
              <input
                id="place-duration"
                aria-describedby={errors.durationMinutes ? "place-duration-error" : undefined}
                aria-invalid={Boolean(errors.durationMinutes)}
                inputMode="numeric"
                min="1"
                max="1440"
                type="number"
                {...register("durationMinutes")}
              />
              {errors.durationMinutes ? (
                <span id="place-duration-error" role="alert">
                  {errors.durationMinutes.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="place-longitude">경도</label>
              <input
                id="place-longitude"
                aria-describedby={errors.longitude ? "place-longitude-error" : undefined}
                aria-invalid={Boolean(errors.longitude)}
                inputMode="decimal"
                step="any"
                type="number"
                {...register("longitude")}
              />
              {errors.longitude ? (
                <span id="place-longitude-error" role="alert">
                  {errors.longitude.message}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="place-latitude">위도</label>
              <input
                id="place-latitude"
                aria-describedby={errors.latitude ? "place-latitude-error" : undefined}
                aria-invalid={Boolean(errors.latitude)}
                inputMode="decimal"
                step="any"
                type="number"
                {...register("latitude")}
              />
              {errors.latitude ? (
                <span id="place-latitude-error" role="alert">
                  {errors.latitude.message}
                </span>
              ) : null}
            </div>

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
