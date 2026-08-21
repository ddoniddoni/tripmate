import { describe, expect, it } from "vitest";

import { isSupabaseJwtIssuedInFutureError } from "@/shared/api/supabase/auth-retry";

describe("isSupabaseJwtIssuedInFutureError", () => {
  it("recognizes only Supabase's transient token-clock response", () => {
    expect(
      isSupabaseJwtIssuedInFutureError({
        code: "PGRST303",
        message: "JWT issued at future",
      }),
    ).toBe(true);
  });

  it("does not retry unrelated database or malformed errors", () => {
    expect(isSupabaseJwtIssuedInFutureError({ code: "42501", message: "permission denied" })).toBe(
      false,
    );
    expect(isSupabaseJwtIssuedInFutureError({ code: "PGRST303", message: "JWT expired" })).toBe(
      false,
    );
    expect(isSupabaseJwtIssuedInFutureError(null)).toBe(false);
  });
});
