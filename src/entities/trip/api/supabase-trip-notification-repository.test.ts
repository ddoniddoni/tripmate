import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  gt: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  })),
}));

import {
  countSupabasePendingTripInvitationNotifications,
  listSupabaseTripInvitationNotifications,
} from "@/entities/trip/api/supabase-trip-notification-repository";

const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

describe("Supabase trip invitation notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      eq: mocks.eq,
      gt: mocks.gt,
      select: mocks.select,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ count: 1, data: [], error: null }).then(resolve),
    };

    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.gt.mockReturnValue(builder);
    mocks.rpc.mockResolvedValue({ data: [], error: null });
  });

  it("lists only notifications assigned to the authenticated user", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          created_at: "2026-08-22T00:00:00.000Z",
          expires_at: "2026-08-29T00:00:00.000Z",
          id: "791fa61b-fd1e-4f09-a331-e0816e32728d",
          role: "editor",
          status: "pending",
          trip_destination: "제주",
          trip_end_date: "2026-09-02",
          trip_id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
          trip_start_date: "2026-08-30",
          trip_time_zone: "Asia/Seoul",
          trip_title: "제주 여행",
        },
      ],
      error: null,
    });

    await expect(listSupabaseTripInvitationNotifications(userId)).resolves.toMatchObject([
      {
        role: "editor",
        status: "pending",
        trip: { destination: "제주", title: "제주 여행" },
      },
    ]);

    expect(mocks.rpc).toHaveBeenCalledWith("list_trip_invitation_notifications");
  });

  it("counts only unexpired pending invitations for the header badge", async () => {
    await expect(countSupabasePendingTripInvitationNotifications(userId)).resolves.toBe(1);

    expect(mocks.eq).toHaveBeenCalledWith("recipient_id", userId);
    expect(mocks.eq).toHaveBeenCalledWith("status", "pending");
    expect(mocks.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });
});
