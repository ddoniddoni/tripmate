import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  deleteEq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  memberEq: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  select: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

import { deleteTrip } from "@/features/trip-management/model/delete-trip-action";
import { initialDeleteTripActionState } from "@/features/trip-management/model/delete-trip-action-state";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

function createFormData() {
  const formData = new FormData();
  formData.set("tripId", tripId);
  return formData;
}

describe("deleteTrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const memberBuilder = {
      eq: mocks.memberEq,
      maybeSingle: mocks.maybeSingle,
      select: mocks.select,
    };
    const tripBuilder = {
      delete: mocks.delete,
      eq: mocks.deleteEq,
    };

    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.select.mockReturnValue(memberBuilder);
    mocks.memberEq.mockReturnValue(memberBuilder);
    mocks.maybeSingle.mockResolvedValue({ data: { role: "owner" }, error: null });
    mocks.delete.mockReturnValue(tripBuilder);
    mocks.deleteEq.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) =>
      table === "trip_members" ? memberBuilder : tripBuilder,
    );
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("requires a logged-in user before checking deletion data", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(deleteTrip(initialDeleteTripActionState, createFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects deletion by a non-owner before issuing a trip deletion", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { role: "editor" }, error: null });

    await expect(deleteTrip(initialDeleteTripActionState, createFormData())).resolves.toEqual({
      message: "여행을 삭제할 권한이 없습니다.",
      status: "error",
    });

    expect(mocks.from).toHaveBeenCalledWith("trip_members");
    expect(mocks.memberEq).toHaveBeenNthCalledWith(1, "trip_id", tripId);
    expect(mocks.memberEq).toHaveBeenNthCalledWith(2, "user_id", userId);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("deletes an owned trip then returns to the trip list", async () => {
    await expect(deleteTrip(initialDeleteTripActionState, createFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.from).toHaveBeenNthCalledWith(1, "trip_members");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "trips");
    expect(mocks.deleteEq).toHaveBeenCalledWith("id", tripId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.redirect).toHaveBeenCalledWith("/trips");
  });
});
