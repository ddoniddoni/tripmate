import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { createTrip } from "@/features/trip-management/model/create-trip-action";
import { initialCreateTripActionState } from "@/features/trip-management/model/create-trip-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

function createTripFormData() {
  const formData = new FormData();
  formData.set("title", "가을의 부산");
  formData.set("destination", "대한민국 · 부산");
  formData.set("startDate", "2026-10-01");
  formData.set("endDate", "2026-10-04");
  formData.set("timeZone", "Asia/Seoul");
  return formData;
}

describe("createTrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("550e8400-e29b-41d4-a716-446655440000");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
    } as never);
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("creates a stable ID before inserting so the response does not require an RLS read", async () => {
    await expect(createTrip(initialCreateTripActionState, createTripFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.insert).toHaveBeenCalledWith({
      destination: "대한민국 · 부산",
      end_date: "2026-10-04",
      id: "550e8400-e29b-41d4-a716-446655440000",
      owner_id: "user-123",
      start_date: "2026-10-01",
      time_zone: "Asia/Seoul",
      title: "가을의 부산",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.redirect).toHaveBeenCalledWith("/trips/550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns a user-facing error when the insert fails", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "42501" } });

    await expect(createTrip(initialCreateTripActionState, createTripFormData())).resolves.toEqual({
      message: "여행을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
