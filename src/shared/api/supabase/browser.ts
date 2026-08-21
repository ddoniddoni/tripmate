"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/shared/config/public-env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { key, url } = getSupabasePublicConfig();
    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
