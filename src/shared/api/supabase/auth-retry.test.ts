import { describe, expect, it, vi } from "vitest";

import {
  isSupabaseJwtValidationError,
  retrySupabaseJwtValidation,
} from "@/shared/api/supabase/auth-retry";

describe("Supabase JWT validation retry", () => {
  it("recognizes the transient token-clock response even when PostgREST omits its detail", () => {
    expect(
      isSupabaseJwtValidationError({
        code: "PGRST303",
        message: "JWT issued at future",
      }),
    ).toBe(true);
    expect(
      isSupabaseJwtValidationError({
        code: "PGRST303",
        message: "JWT claims validation failed",
      }),
    ).toBe(true);
  });

  it("does not retry unrelated database or malformed errors", () => {
    expect(isSupabaseJwtValidationError({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isSupabaseJwtValidationError(null)).toBe(false);
  });

  it("retries a transient JWT validation failure through the three-attempt window", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST303", message: "JWT issued at future" } })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST303", message: "JWT issued at future" } })
      .mockResolvedValueOnce({ data: { id: "profile-id" }, error: null });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(retrySupabaseJwtValidation(request, wait)).resolves.toEqual({
      data: { id: "profile-id" },
      error: null,
    });
    expect(wait).toHaveBeenNthCalledWith(1, 1_000);
    expect(wait).toHaveBeenNthCalledWith(2, 2_000);
    expect(request).toHaveBeenCalledTimes(3);
  });
});
