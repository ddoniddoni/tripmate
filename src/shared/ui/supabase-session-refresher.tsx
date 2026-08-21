"use client";

import { useEffect } from "react";

/** Keeps the cookie-backed Supabase session refreshed while the app is open. */
export function SupabaseSessionRefresher() {
  useEffect(() => {
    let isDisposed = false;

    void import("@/shared/api/supabase/browser").then(({ createSupabaseBrowserClient }) => {
      if (!isDisposed) {
        createSupabaseBrowserClient();
      }
    });

    return () => {
      isDisposed = true;
    };
  }, []);

  return null;
}
