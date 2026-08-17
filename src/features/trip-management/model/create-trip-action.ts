"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCreateTripFormData } from "@/entities/trip/model/create-trip";
import type { CreateTripActionState } from "@/features/trip-management/model/create-trip-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export async function createTrip(
  _previousState: CreateTripActionState,
  formData: FormData,
): Promise<CreateTripActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const inputResult = parseCreateTripFormData(formData);

  if (!inputResult.success) {
    return {
      message: inputResult.error.issues[0]?.message ?? "여행 정보를 확인해 주세요.",
      status: "error",
    };
  }

  const tripId = crypto.randomUUID();
  const shouldOpenAiPlanner = formData.get("openAiPlanner") === "true";
  const { error } = await supabase.from("trips").insert({
    destination: inputResult.data.destination,
    end_date: inputResult.data.endDate,
    id: tripId,
    owner_id: user.id,
    start_date: inputResult.data.startDate,
    time_zone: inputResult.data.timeZone,
    title: inputResult.data.title,
  });

  if (error) {
    return {
      message: "여행을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  revalidatePath("/trips");
  redirect(`/trips/${tripId}${shouldOpenAiPlanner ? "?ai=1" : ""}`);
}
