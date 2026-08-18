import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: mocks.from })),
}));

import {
  getSupabaseUserProfile,
  SupabaseProfileRepositoryError,
} from "@/entities/user/api/supabase-profile-repository";

const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

describe("Supabase profile repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  });

  it("returns the current user's nullable profile name", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { display_name: "지우", id: userId },
      error: null,
    });

    await expect(getSupabaseUserProfile(userId)).resolves.toEqual({
      displayName: "지우",
      id: userId,
    });
    expect(mocks.from).toHaveBeenCalledWith("profiles");
  });

  it("does not query the database for an invalid user id", async () => {
    await expect(getSupabaseUserProfile("not-a-user-id")).resolves.toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("wraps profile query failures in a user-facing repository error", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        details: "permission denied",
        hint: null,
        message: "database unavailable",
      },
    });

    await expect(getSupabaseUserProfile(userId)).rejects.toBeInstanceOf(
      SupabaseProfileRepositoryError,
    );
    expect(console.error).toHaveBeenCalledWith("Supabase profile query failed.", {
      code: "42501",
      details: "permission denied",
      hint: null,
      message: "database unavailable",
    });
  });
});
