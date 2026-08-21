"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isSupabaseTripCoverColumnUnavailable,
} from "@/entities/trip/api/supabase-trip-repository";
import {
  tripCoverImagePathSchema,
  tripCoverImageUploadSchema,
} from "@/entities/trip/model/trip-cover-image";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { z } from "@/shared/lib/zod";

const tripCoverBucket = "trip-covers";
const ownerMembershipSchema = z.object({
  role: z.literal("owner"),
});
const tripCoverRowSchema = z.object({
  cover_image_path: tripCoverImagePathSchema.nullable(),
  id: z.uuid(),
});

export type TripCoverImageActionState = {
  message: string;
  status: "error" | "success";
};

async function getOwnedTripCover(input: { tripId: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", input.tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !ownerMembershipSchema.safeParse(membership).success) {
    return { error: "커버 사진은 여행 소유자만 바꿀 수 있어요." } as const;
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, cover_image_path")
    .eq("id", input.tripId)
    .maybeSingle();
  const parsedTrip = tripCoverRowSchema.safeParse(trip);

  if (tripError || !parsedTrip.success) {
    if (isSupabaseTripCoverColumnUnavailable(tripError)) {
      return {
        error:
          "커버 사진 기능을 사용하려면 Supabase 데이터베이스 업데이트를 먼저 적용해 주세요.",
      } as const;
    }

    return { error: "여행 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." } as const;
  }

  return { supabase, trip: parsedTrip.data } as const;
}

function revalidateTripCover(tripId: string) {
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
}

export async function updateTripCoverImage(
  input: unknown,
): Promise<TripCoverImageActionState> {
  const inputResult = tripCoverImageUploadSchema.safeParse(input);

  if (!inputResult.success) {
    return { message: "커버 사진 정보를 확인해 주세요.", status: "error" };
  }

  const { coverImagePath, tripId } = inputResult.data;

  if (!coverImagePath.startsWith(`${tripId}/`)) {
    return { message: "커버 사진 정보를 확인해 주세요.", status: "error" };
  }

  const ownedTripResult = await getOwnedTripCover({ tripId });

  if ("error" in ownedTripResult) {
    return {
      message: ownedTripResult.error ?? "커버 사진을 변경할 권한이 없습니다.",
      status: "error",
    };
  }

  const { error: updateError } = await ownedTripResult.supabase
    .from("trips")
    .update({ cover_image_path: coverImagePath })
    .eq("id", tripId);

  if (updateError) {
    if (isSupabaseTripCoverColumnUnavailable(updateError)) {
      return {
        message:
          "커버 사진 기능을 사용하려면 Supabase 데이터베이스 업데이트를 먼저 적용해 주세요.",
        status: "error",
      };
    }

    return { message: "커버 사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: "error" };
  }

  if (
    ownedTripResult.trip.cover_image_path &&
    ownedTripResult.trip.cover_image_path !== coverImagePath
  ) {
    await ownedTripResult.supabase.storage
      .from(tripCoverBucket)
      .remove([ownedTripResult.trip.cover_image_path]);
  }

  revalidateTripCover(tripId);
  return { message: "커버 사진을 저장했어요.", status: "success" };
}

export async function removeTripCoverImage(input: unknown): Promise<TripCoverImageActionState> {
  const tripIdResult = z.uuid("여행 정보를 확인해 주세요.").safeParse(input);

  if (!tripIdResult.success) {
    return { message: "여행 정보를 확인해 주세요.", status: "error" };
  }

  const tripId = tripIdResult.data;
  const ownedTripResult = await getOwnedTripCover({ tripId });

  if ("error" in ownedTripResult) {
    return {
      message: ownedTripResult.error ?? "커버 사진을 변경할 권한이 없습니다.",
      status: "error",
    };
  }

  if (!ownedTripResult.trip.cover_image_path) {
    return { message: "삭제할 커버 사진이 없어요.", status: "error" };
  }

  const { error: updateError } = await ownedTripResult.supabase
    .from("trips")
    .update({ cover_image_path: null })
    .eq("id", tripId);

  if (updateError) {
    if (isSupabaseTripCoverColumnUnavailable(updateError)) {
      return {
        message:
          "커버 사진 기능을 사용하려면 Supabase 데이터베이스 업데이트를 먼저 적용해 주세요.",
        status: "error",
      };
    }

    return { message: "커버 사진을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: "error" };
  }

  await ownedTripResult.supabase.storage
    .from(tripCoverBucket)
    .remove([ownedTripResult.trip.cover_image_path]);

  revalidateTripCover(tripId);
  return { message: "커버 사진을 삭제했어요.", status: "success" };
}
