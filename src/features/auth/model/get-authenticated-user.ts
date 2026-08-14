import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export type AuthenticatedUser = {
  email: string | null;
  id: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  return {
    email: typeof claims.email === "string" ? claims.email : null,
    id: claims.sub,
  };
}
