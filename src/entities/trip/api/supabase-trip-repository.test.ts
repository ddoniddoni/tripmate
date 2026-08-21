import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  waitForSupabaseTokenClockSync: vi.fn(),
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: mocks.from })),
}));

vi.mock("@/shared/api/supabase/auth-retry", () => ({
  isSupabaseJwtIssuedInFutureError: (error: { code?: string } | null) =>
    error?.code === "PGRST303",
  waitForSupabaseTokenClockSync: mocks.waitForSupabaseTokenClockSync,
}));

import {
  listSupabaseTrips,
  SupabaseTripRepositoryError,
} from "@/entities/trip/api/supabase-trip-repository";

const tripRow = {
  destination: "제주",
  end_date: "2099-07-03",
  id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
  start_date: "2099-07-01",
  time_zone: "Asia/Seoul",
  title: "여름 제주 여행",
};

describe("listSupabaseTrips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const builder = { order: mocks.order, select: mocks.select };

    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
  });

  it("keeps the trip list available when the cover-image migration is not applied yet", async () => {
    mocks.order
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the 'cover_image_path' column of 'trips' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: [tripRow], error: null });

    await expect(listSupabaseTrips()).resolves.toEqual([
      expect.objectContaining({ coverImagePath: undefined, id: tripRow.id, title: tripRow.title }),
    ]);
    expect(mocks.select).toHaveBeenNthCalledWith(
      1,
      "id, title, destination, start_date, end_date, time_zone, cover_image_path",
    );
    expect(mocks.select).toHaveBeenNthCalledWith(
      2,
      "id, title, destination, start_date, end_date, time_zone",
    );
  });

  it("does not hide unrelated trip query failures", async () => {
    mocks.order.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });

    await expect(listSupabaseTrips()).rejects.toBeInstanceOf(SupabaseTripRepositoryError);
    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("Supabase trip query failed.", {
      code: "42501",
      details: undefined,
      hint: undefined,
      message: "permission denied",
      operation: "list",
    });
  });

  it("retries once when a newly refreshed Supabase token briefly reaches the Data API too early", async () => {
    mocks.order
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST303", message: "JWT issued at future" },
      })
      .mockResolvedValueOnce({ data: [tripRow], error: null });

    await expect(listSupabaseTrips()).resolves.toEqual([
      expect.objectContaining({ id: tripRow.id, title: tripRow.title }),
    ]);

    expect(mocks.waitForSupabaseTokenClockSync).toHaveBeenCalledOnce();
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });
});
