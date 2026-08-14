"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseRemoveTripMemberFormData,
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
