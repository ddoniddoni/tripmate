"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseProfileDisplayNameFormData } from "@/entities/user/model/profile";
import type { UpdateProfileActionState } from "@/features/profile/model/profile-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { getSafeInternalPath } from "@/shared/lib/safe-internal-path";

export async function updateProfileDisplayName(
  formData: FormData,
): Promise<UpdateProfileActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const nameResult = parseProfileDisplayNameFormData(formData);
  const nextPath = getSafeInternalPath(formData.get("next"));

  if (!nameResult.success) {
    return {
      message: nameResult.error.issues[0]?.message ?? "닉네임을 확인해 주세요.",
      status: "error",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: nameResult.data })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message: "닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/trips");
  revalidatePath(nextPath);

  return {
    message: "닉네임을 저장했어요.",
    status: "success",
  };
}
