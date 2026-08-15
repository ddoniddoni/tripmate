import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  gt: vi.fn(),
  is: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mocks.from })),
}));

import {
  getSupabaseTripInvitationPreview,
  SupabaseTripRepositoryError,
} from "@/entities/trip/api/supabase-trip-repository";

const tokenHash = "a".repeat(64);

describe("getSupabaseTripInvitationPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      eq: mocks.eq,
      gt: mocks.gt,
      is: mocks.is,
      maybeSingle: mocks.maybeSingle,
      select: mocks.select,
    };

    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.is.mockReturnValue(builder);
    mocks.gt.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({
      data: {
        expires_at: "2099-07-01T00:00:00.000Z",
        role: "editor",
        trips: {
          destination: "제주",
          end_date: "2099-07-03",
          id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
          start_date: "2099-07-01",
          time_zone: "Asia/Seoul",
          title: "여름 제주 여행",
        },
      },
      error: null,
    });
  });

  it("returns only a pending invitation addressed to the authenticated email", async () => {
    await expect(
      getSupabaseTripInvitationPreview({ email: "FRIEND@example.com", tokenHash }),
    ).resolves.toMatchObject({
      role: "editor",
      trip: { destination: "제주", title: "여름 제주 여행" },
    });

    expect(mocks.from).toHaveBeenCalledWith("trip_invitations");
    expect(mocks.eq).toHaveBeenCalledWith("email", "friend@example.com");
    expect(mocks.eq).toHaveBeenCalledWith("token_hash", tokenHash);
    expect(mocks.is).toHaveBeenCalledWith("accepted_at", null);
    expect(mocks.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("does not query with malformed invitation lookup values", async () => {
    await expect(
      getSupabaseTripInvitationPreview({ email: "not-an-email", tokenHash: "bad" }),
    ).resolves.toBeNull();

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("converts an adapter error into the repository error", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: new Error("denied") });

    await expect(
      getSupabaseTripInvitationPreview({ email: "friend@example.com", tokenHash }),
    ).rejects.toBeInstanceOf(SupabaseTripRepositoryError);
  });
});
