import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from "@/shared/config/public-env";

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();

  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
