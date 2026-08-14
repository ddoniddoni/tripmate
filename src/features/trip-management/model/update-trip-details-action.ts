"use server";

import { Liveblocks } from "@liveblocks/node";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/shared/lib/zod";

import {
  applyItineraryMutationToStorage,
  getLiveblocksItinerarySnapshot,
} from "@/features/collaboration/model/liveblocks-itinerary";
import { getTripRoomId } from "@/features/collaboration/model/trip-room";
import {
  resizeTripItinerary,
  type ItineraryMutationResult,
} from "@/entities/itinerary/model/mutations";
import { tripSchema, type Trip } from "@/entities/trip/model/trip";
import { parseUpdateTripDetailsFormData } from "@/entities/trip/model/update-trip-details";
import type { UpdateTripDetailsActionState } from "@/features/trip-management/model/update-trip-details-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const ownerMembershipSchema = z.object({
  role: z.literal("owner"),
});

const updatedTripSchema = z.object({
  id: z.uuid(),
});

const storedTripRowSchema = z.object({
  destination: tripSchema.shape.destination,
  end_date: tripSchema.shape.endDate,
  id: z.uuid(),
  start_date: tripSchema.shape.startDate,
  time_zone: tripSchema.shape.timeZone,
  title: tripSchema.shape.title,
});

function toTrip(row: unknown): Trip | null {
  const result = storedTripRowSchema.safeParse(row);

  if (!result.success) {
    return null;
  }

  return tripSchema.parse({
    destination: result.data.destination,
    endDate: result.data.end_date,
    id: result.data.id,
    startDate: result.data.start_date,
    timeZone: result.data.time_zone,
    title: result.data.title,
  });
}

function createTripUpdate(input: {
  destination: string;
  endDate: string;
  startDate: string;
  title: string;
}) {
  return {
    destination: input.destination,
    end_date: input.endDate,
    start_date: input.startDate,
    title: input.title,
  };
}

export async function updateTripDetails(
  _previousState: UpdateTripDetailsActionState,
  formData: FormData,
): Promise<UpdateTripDetailsActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const inputResult = parseUpdateTripDetailsFormData(formData);

  if (!inputResult.success) {
    return {
      message: inputResult.error.issues[0]?.message ?? "여행 정보를 확인해 주세요.",
      status: "error",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", inputResult.data.tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !ownerMembershipSchema.safeParse(membership).success) {
    return { message: "여행 정보를 수정할 권한이 없습니다.", status: "error" };
  }

  const { data: storedTrip, error: storedTripError } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, time_zone")
    .eq("id", inputResult.data.tripId)
    .maybeSingle();
  const currentTrip = storedTripError ? null : toTrip(storedTrip);

  if (!currentTrip) {
    return {
      message: "여행 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  const datesChanged =
    currentTrip.startDate !== inputResult.data.startDate ||
    currentTrip.endDate !== inputResult.data.endDate;
  const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY;
  const liveblocks = datesChanged && liveblocksSecret ? new Liveblocks({ secret: liveblocksSecret }) : null;

  if (datesChanged && !liveblocks) {
    return {
      message: "공유 일정 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  if (liveblocks) {
    try {
      const storage = await liveblocks.getStorageDocument(getTripRoomId(currentTrip.id), "json");
      const currentItinerary = getLiveblocksItinerarySnapshot(currentTrip, storage);

      if (!currentItinerary) {
        return {
          message: "공유 일정을 불러오지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.",
          status: "error",
        };
      }

      const resizeResult = resizeTripItinerary(currentItinerary, inputResult.data);

      if (!resizeResult.success) {
        return { message: resizeResult.message, status: "error" };
      }
    } catch {
      return {
        message: "공유 일정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        status: "error",
      };
    }
  }

  const { data: updatedTrip, error: updateError } = await supabase
    .from("trips")
    .update(createTripUpdate(inputResult.data))
    .eq("id", inputResult.data.tripId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedTripSchema.safeParse(updatedTrip).success) {
    return {
      message: "여행 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  if (liveblocks) {
    const mutationState: { result: ItineraryMutationResult | null } = { result: null };

    try {
      await liveblocks.mutateStorage(getTripRoomId(currentTrip.id), ({ root }) => {
        mutationState.result = applyItineraryMutationToStorage(root, currentTrip, (current) =>
          resizeTripItinerary(current, inputResult.data),
        );
      });
    } catch {
      mutationState.result = null;
    }

    const storageResult = mutationState.result;

    if (!storageResult?.success) {
      await supabase
        .from("trips")
        .update(createTripUpdate(currentTrip))
        .eq("id", currentTrip.id)
        .select("id")
        .maybeSingle();

      return {
        message:
          storageResult?.message ??
          "여행 기간을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        status: "error",
      };
    }
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${inputResult.data.tripId}`);

  return { message: "여행 정보를 저장했습니다.", status: "success" };
}
