import { z } from "@/shared/lib/zod";

import {
  profileDisplayNameSchema,
  type UserProfile,
  userProfileSchema,
} from "@/entities/user/model/profile";
import {
  retrySupabaseJwtValidation,
} from "@/shared/api/supabase/auth-retry";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const profileIdSchema = z.uuid();
const supabaseProfileRowSchema = z.object({
  display_name: profileDisplayNameSchema.nullable(),
  id: profileIdSchema,
});

export class SupabaseProfileRepositoryError extends Error {
  constructor() {
    super("프로필 정보를 불러오지 못했습니다.");
    this.name = "SupabaseProfileRepositoryError";
  }
}

function toUserProfile(row: z.infer<typeof supabaseProfileRowSchema>): UserProfile {
  return userProfileSchema.parse({
    displayName: row.display_name,
    id: row.id,
  });
}

export async function getSupabaseUserProfile(userId: string): Promise<UserProfile | null> {
  if (!profileIdSchema.safeParse(userId).success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const requestProfile = () =>
    supabase.from("profiles").select("id, display_name").eq("id", userId).maybeSingle();
  const { data, error } = await retrySupabaseJwtValidation(requestProfile);

  if (error) {
    console.error("Supabase profile query failed.", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });

    throw new SupabaseProfileRepositoryError();
  }

  if (!data) {
    return null;
  }

  try {
    return toUserProfile(supabaseProfileRowSchema.parse(data));
  } catch {
    throw new SupabaseProfileRepositoryError();
  }
}
