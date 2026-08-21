"use client";

import * as Dialog from "@radix-ui/react-dialog";

import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import type { PlaceDetailsState } from "@/features/place-search/model/use-place-details";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";

type PlacePreviewDialogProps = {
  detailsState: PlaceDetailsState;
  onLoadDetails: (providerPlaceId: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (place: PlaceSnapshot) => void;
  open: boolean;
  place: PlaceSnapshot;
};

function getGoogleMapsUrl(place: PlaceSnapshot) {
  const searchParams = new URLSearchParams({
    api: "1",
    query: `${place.name} ${place.address}`,
  });

  if (place.provider === "google") {
    searchParams.set("query_place_id", place.providerPlaceId);
  }

  return `https://www.google.com/maps/search/?${searchParams.toString()}`;
}

function formatRating(rating: number) {
  return `${rating.toFixed(1)}점`;
}

export function PlacePreviewDialog({
  detailsState,
  onLoadDetails,
  onOpenChange,
  onSelect,
  open,
  place,
}: PlacePreviewDialogProps) {
  const isCurrentPlace = detailsState.placeId === place.providerPlaceId;
  const details = isCurrentPlace ? detailsState.details : null;
  const detailsStatus = isCurrentPlace ? detailsState.status : "idle";
  const detailsErrorMessage = isCurrentPlace ? detailsState.errorMessage : null;
  const supportsDetails = place.provider === "google";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay place-preview-dialog-overlay" />
        <Dialog.Content
          className="dialog-content place-preview-dialog"
          aria-describedby="place-preview-dialog-description"
        >
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">장소 미리보기</span>
              <Dialog.Title>{place.name} 정보 확인</Dialog.Title>
              <Dialog.Description className="dialog-description" id="place-preview-dialog-description">
                위치를 확인한 뒤 이 장소를 일정에 넣어 보세요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="장소 미리보기 닫기">
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          <div className="place-preview-content">
            <section className="place-preview-location-card" aria-label={`${place.name} 기본 정보`}>
              <span>{place.category ?? "장소"}</span>
              <strong>{place.name}</strong>
              <p>{place.address}</p>
              <a href={getGoogleMapsUrl(place)} rel="noreferrer" target="_blank">
                Google 지도에서 보기
                <span aria-hidden="true">↗</span>
              </a>
            </section>

            {supportsDetails ? (
              <section className="place-preview-details" aria-labelledby="place-preview-details-title">
                <div>
                  <h3 id="place-preview-details-title">장소 상세 정보</h3>
                  <p>평점과 영업시간은 원할 때만 불러와요.</p>
                </div>
                {detailsStatus === "success" ? (
                  <div className="place-preview-detail-result">
                    <dl>
                      <div>
                        <dt>Google 평점</dt>
                        <dd>
                          {details?.rating !== undefined ? formatRating(details.rating) : "정보 없음"}
                          {details?.userRatingCount !== undefined
                            ? ` · ${details.userRatingCount.toLocaleString("ko-KR")}개 리뷰`
                            : null}
                        </dd>
                      </div>
                      <div>
                        <dt>영업시간</dt>
                        <dd>
                          {details?.regularOpeningHours?.length
                            ? "주간 운영 시간 확인"
                            : "정보 없음"}
                        </dd>
                      </div>
                    </dl>
                    {details?.regularOpeningHours?.length ? (
                      <details>
                        <summary>주간 영업시간 보기</summary>
                        <ul>
                          {details.regularOpeningHours.map((openingHour) => (
                            <li key={openingHour}>{openingHour}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                ) : null}
                {detailsStatus === "error" ? (
                  <p className="place-preview-detail-error" role="alert">
                    {detailsErrorMessage}
                  </p>
                ) : null}
                <button
                  className="place-preview-details-button"
                  disabled={detailsStatus === "loading"}
                  onClick={() => onLoadDetails(place.providerPlaceId)}
                  type="button"
                >
                  {detailsStatus === "loading" ? "상세 정보를 불러오는 중…" : "상세 정보 보기"}
                </button>
              </section>
            ) : null}

            <div className="dialog-actions place-preview-actions">
              <Dialog.Close asChild>
                <button className="place-preview-dismiss" type="button">
                  다른 장소 보기
                </button>
              </Dialog.Close>
              <button className="primary-button" onClick={() => onSelect(place)} type="button">
                이 장소 선택
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
