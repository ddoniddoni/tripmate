"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseLeaveTripFormData,
  parseRemoveTripMemberFormData,
  parseTransferTripOwnershipFormData,
  parseUpdateTripMemberRoleFormData,
} from "@/entities/trip/model/trip-membership";
import type { TripMemberActionResult } from "@/features/trip-sharing/model/trip-member-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

async function getActionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function updateTripMemberRole(formData: FormData): Promise<TripMemberActionResult> {
  const { supabase, user } = await getActionUser();
  const inputResult = parseUpdateTripMemberRoleFormData(formData);

  if (!inputResult.success) {
    return { message: "변경할 멤버와 권한을 확인해 주세요.", success: false };
  }

  if (inputResult.data.memberId === user.id) {
    return { message: "내 소유자 권한은 이곳에서 변경할 수 없습니다.", success: false };
  }

  const { data, error } = await supabase
    .from("trip_members")
    .update({ role: inputResult.data.role })
    .eq("trip_id", inputResult.data.tripId)
    .eq("user_id", inputResult.data.memberId)
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    return { message: "권한을 변경하지 못했습니다. 소유자 권한을 다시 확인해 주세요.", success: false };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);
  return { message: "멤버 권한을 변경했어요.", success: true };
}

export async function removeTripMember(formData: FormData): Promise<TripMemberActionResult> {
  const { supabase, user } = await getActionUser();
  const inputResult = parseRemoveTripMemberFormData(formData);

  if (!inputResult.success) {
    return { message: "제외할 멤버를 확인해 주세요.", success: false };
  }

  if (inputResult.data.memberId === user.id) {
    return { message: "소유자는 이곳에서 자신을 제외할 수 없습니다.", success: false };
  }

  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", inputResult.data.tripId)
    .eq("user_id", inputResult.data.memberId)
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    return { message: "멤버를 제외하지 못했습니다. 소유자 권한을 다시 확인해 주세요.", success: false };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);
  return { message: "멤버를 여행에서 제외했어요.", success: true };
}

export async function leaveTrip(formData: FormData): Promise<TripMemberActionResult> {
  const { supabase, user } = await getActionUser();
  const inputResult = parseLeaveTripFormData(formData);

  if (!inputResult.success) {
    return { message: "나갈 여행을 확인해 주세요.", success: false };
  }

  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", inputResult.data.tripId)
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    return {
      message: "여행에서 나가지 못했습니다. 소유자라면 먼저 다른 멤버에게 소유권을 넘겨 주세요.",
      success: false,
    };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);
  revalidatePath("/trips");
  return { message: "여행에서 나왔어요.", success: true };
}

export async function transferTripOwnership(formData: FormData): Promise<TripMemberActionResult> {
  const { supabase, user } = await getActionUser();
  const inputResult = parseTransferTripOwnershipFormData(formData);

  if (!inputResult.success) {
    return { message: "새 소유자를 확인해 주세요.", success: false };
  }

  if (inputResult.data.memberId === user.id) {
    return { message: "나 자신에게 소유권을 넘길 수 없습니다.", success: false };
  }

  const { data, error } = await supabase.rpc("transfer_trip_ownership", {
    next_owner_id: inputResult.data.memberId,
    target_trip_id: inputResult.data.tripId,
  });

  if (error || data !== true) {
    return { message: "소유권을 넘기지 못했습니다. 멤버와 현재 권한을 다시 확인해 주세요.", success: false };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);
  revalidatePath("/trips");
  return { message: "여행 소유권을 넘겼어요. 이제 필요하면 여행에서 나갈 수 있습니다.", success: true };
}
