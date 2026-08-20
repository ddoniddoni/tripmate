import { z } from "@/shared/lib/zod";

import {
  profileDisplayNameSchema,
  type UserProfile,
  userProfileSchema,
} from "@/entities/user/model/profile";
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/shared/api/supabase/server";

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

export async function getSupabaseUserProfile(
  userId: string,
  serverClient?: SupabaseServerClient,
): Promise<UserProfile | null> {
  if (!profileIdSchema.safeParse(userId).success) {
    return null;
  }

  const supabase = serverClient ?? (await createSupabaseServerClient());
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase profile query failed.", {
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      message: error.message ?? null,
      name: error.name ?? null,
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
