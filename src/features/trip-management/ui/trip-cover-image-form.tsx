"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  removeTripCoverImage,
  updateTripCoverImage,
  type TripCoverImageActionState,
} from "@/features/trip-management/model/trip-cover-image-action";
import { DefaultTripCoverArt } from "@/entities/trip/ui/default-trip-cover-art";
import { createSupabaseBrowserClient } from "@/shared/api/supabase/browser";

const tripCoverBucket = "trip-covers";
const maxCoverImageSize = 5 * 1024 * 1024;
const allowedCoverTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type TripCoverImageFormProps = {
  canUpdateTrip: boolean;
  coverImagePath?: string;
  tripId: string;
  tripTitle: string;
};

function getCoverImagePath(tripId: string, file: File) {
  const extension = allowedCoverTypes.get(file.type);

  if (!extension) {
    return null;
  }

  return `${tripId}/${crypto.randomUUID()}.${extension}`;
}

function getValidationMessage(file: File) {
  if (!allowedCoverTypes.has(file.type)) {
    return "JPG, PNG, WebP 형식의 사진만 올릴 수 있어요.";
  }

  if (file.size > maxCoverImageSize) {
    return "커버 사진은 5MB 이하로 올려 주세요.";
  }

  return null;
}

export function TripCoverImageForm({
  canUpdateTrip,
  coverImagePath,
  tripId,
  tripTitle,
}: TripCoverImageFormProps) {
  const router = useRouter();
  const [coverImageOverride, setCoverImageOverride] = useState<string | null | undefined>(undefined);
  const [message, setMessage] = useState<TripCoverImageActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function showMessage(nextMessage: TripCoverImageActionState) {
    setMessage(nextMessage);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = getValidationMessage(file);

    if (validationMessage) {
      showMessage({ message: validationMessage, status: "error" });
      return;
    }

    const nextPath = getCoverImagePath(tripId, file);

    if (!nextPath) {
      showMessage({ message: "커버 사진 정보를 확인해 주세요.", status: "error" });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage.from(tripCoverBucket).upload(nextPath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        showMessage({
          message: "사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.",
          status: "error",
        });
        return;
      }

      try {
        const result = await updateTripCoverImage({ coverImagePath: nextPath, tripId });
        showMessage(result);

        if (result.status === "success") {
          setCoverImageOverride(nextPath);
          router.refresh();
          return;
        }

        await supabase.storage.from(tripCoverBucket).remove([nextPath]);
      } catch {
        await supabase.storage.from(tripCoverBucket).remove([nextPath]);
        showMessage({
          message: "커버 사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          status: "error",
        });
      }
    });
  }

  function handleRemove() {
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await removeTripCoverImage(tripId);
        showMessage(result);

        if (result.status === "success") {
          setCoverImageOverride(null);
          router.refresh();
        }
      } catch {
        showMessage({
          message: "커버 사진을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          status: "error",
        });
      }
    });
  }

  const currentCoverImagePath = coverImageOverride === undefined ? coverImagePath : coverImageOverride;
  const coverImageUrl = currentCoverImagePath
    ? `/api/trips/${tripId}/cover?v=${encodeURIComponent(currentCoverImagePath)}`
    : null;

  return (
    <section aria-labelledby="trip-cover-image-title" className="trip-cover-image-control">
      <div className="trip-cover-image-preview">
        {coverImageUrl ? (
          <Image
            alt={`${tripTitle} 커버 사진`}
            fill
            sizes="(max-width: 700px) 100vw, 42vw"
            src={coverImageUrl}
            unoptimized
          />
        ) : (
          <DefaultTripCoverArt
            className="trip-cover-image-default-art"
            sizes="(max-width: 700px) 100vw, 42vw"
            tripId={tripId}
          />
        )}
      </div>

      <div className="trip-cover-image-copy">
        <div>
          <span className="section-kicker">카드 커버</span>
          <h3 id="trip-cover-image-title">여행 사진</h3>
          <p>여행 카드 상단을 채울 사진이에요. JPG, PNG, WebP · 최대 5MB</p>
        </div>

        {canUpdateTrip ? (
          <div className="trip-cover-image-actions">
            <label className="secondary-button" htmlFor={`trip-cover-image-${tripId}`}>
              {isPending ? "처리 중…" : currentCoverImagePath ? "사진 바꾸기" : "사진 올리기"}
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-label="여행 커버 사진 선택"
              className="sr-only"
              disabled={isPending}
              id={`trip-cover-image-${tripId}`}
              onChange={handleFileChange}
              type="file"
            />
            {currentCoverImagePath ? (
              <button className="trip-cover-image-delete" disabled={isPending} onClick={handleRemove} type="button">
                사진 삭제
              </button>
            ) : null}
          </div>
        ) : (
          <p className="trip-settings-permission-note">커버 사진 변경은 소유자만 할 수 있어요.</p>
        )}

        {message ? (
          <p
            className={`form-message form-message-${message.status} trip-cover-image-message`}
            role={message.status === "error" ? "alert" : "status"}
          >
            {message.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
