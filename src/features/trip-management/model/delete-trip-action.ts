"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/shared/lib/zod";

import type { DeleteTripActionState } from "@/features/trip-management/model/delete-trip-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const deleteTripInputSchema = z.object({
  confirmationTitle: z.string().trim().min(1),
  tripId: z.uuid(),
});

const ownerMembershipSchema = z.object({
  role: z.literal("owner"),
});

export async function deleteTrip(
  _previousState: DeleteTripActionState,
  formData: FormData,
): Promise<DeleteTripActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const inputResult = deleteTripInputSchema.safeParse({
    confirmationTitle: formData.get("confirmationTitle"),
    tripId: formData.get("tripId"),
  });

  if (!inputResult.success) {
    return { message: "삭제할 여행 정보를 확인해 주세요.", status: "error" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", inputResult.data.tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !ownerMembershipSchema.safeParse(membership).success) {
    return { message: "여행을 삭제할 권한이 없습니다.", status: "error" };
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("title")
    .eq("id", inputResult.data.tripId)
    .maybeSingle();

  if (tripError || !trip || trip.title !== inputResult.data.confirmationTitle) {
    return { message: "여행 이름이 일치하지 않습니다. 다시 확인해 주세요.", status: "error" };
  }

  const { error } = await supabase.from("trips").delete().eq("id", inputResult.data.tripId);

  if (error) {
    return { message: "여행을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: "error" };
  }

  revalidatePath("/trips");
  redirect("/trips");
}
