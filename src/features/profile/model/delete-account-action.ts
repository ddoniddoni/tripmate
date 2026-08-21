"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DeleteAccountActionState } from "@/features/profile/model/delete-account-action-state";
import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const deletionConfirmation = "탈퇴";

export async function deleteAccount(
  _previousState: DeleteAccountActionState,
  formData: FormData,
): Promise<DeleteAccountActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  if (formData.get("confirmation")?.toString().trim() !== deletionConfirmation) {
    return { message: `계속하려면 ${deletionConfirmation}를 정확히 입력해 주세요.`, status: "error" };
  }

  const { count: ownedTripCount, error: ownedTripError } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (ownedTripError) {
    return { message: "소유한 여행을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: "error" };
  }

  if ((ownedTripCount ?? 0) > 0) {
    return {
      message: `소유한 여행이 ${ownedTripCount}개 있어요. 먼저 다른 멤버에게 소유권을 넘기거나 여행을 삭제해 주세요.`,
      status: "error",
    };
  }

  const admin = createSupabaseAdminClient();
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);

  if (deletionError) {
    return { message: "회원 탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: "error" };
  }

  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/profile");
  revalidatePath("/trips");
  redirect("/login?deleted=1");
}
