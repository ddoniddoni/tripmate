import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  deleteEq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  memberEq: vi.fn(),
  memberMaybeSingle: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  memberSelect: vi.fn(),
  tripMaybeSingle: vi.fn(),
  tripSelect: vi.fn(),
  titleEq: vi.fn(),
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

function createFormData(confirmationTitle = "가을의 부산") {
  const formData = new FormData();
  formData.set("confirmationTitle", confirmationTitle);
  formData.set("tripId", tripId);
  return formData;
}

describe("deleteTrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const memberBuilder = {
      eq: mocks.memberEq,
      maybeSingle: mocks.memberMaybeSingle,
      select: mocks.memberSelect,
    };
    const titleBuilder = {
      maybeSingle: mocks.tripMaybeSingle,
    };
    const tripBuilder = {
      delete: mocks.delete,
      eq: mocks.deleteEq,
      select: mocks.tripSelect,
    };

    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.memberSelect.mockReturnValue(memberBuilder);
    mocks.memberEq.mockReturnValue(memberBuilder);
    mocks.memberMaybeSingle.mockResolvedValue({ data: { role: "owner" }, error: null });
    mocks.tripSelect.mockReturnValue({ eq: mocks.titleEq });
    mocks.titleEq.mockReturnValue(titleBuilder);
    mocks.tripMaybeSingle.mockResolvedValue({ data: { title: "가을의 부산" }, error: null });
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
    mocks.memberMaybeSingle.mockResolvedValue({ data: { role: "editor" }, error: null });

    await expect(deleteTrip(initialDeleteTripActionState, createFormData())).resolves.toEqual({
      message: "여행을 삭제할 권한이 없습니다.",
      status: "error",
    });

    expect(mocks.from).toHaveBeenCalledWith("trip_members");
    expect(mocks.memberEq).toHaveBeenNthCalledWith(1, "trip_id", tripId);
    expect(mocks.memberEq).toHaveBeenNthCalledWith(2, "user_id", userId);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("requires the owner to confirm the current trip title before deletion", async () => {
    await expect(
      deleteTrip(initialDeleteTripActionState, createFormData("다른 여행")),
    ).resolves.toEqual({
      message: "여행 이름이 일치하지 않습니다. 다시 확인해 주세요.",
      status: "error",
    });

    expect(mocks.from).toHaveBeenNthCalledWith(1, "trip_members");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "trips");
    expect(mocks.tripSelect).toHaveBeenCalledWith("title");
    expect(mocks.titleEq).toHaveBeenCalledWith("id", tripId);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("deletes an owned trip then returns to the trip list", async () => {
    await expect(deleteTrip(initialDeleteTripActionState, createFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.from).toHaveBeenNthCalledWith(1, "trip_members");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "trips");
    expect(mocks.from).toHaveBeenNthCalledWith(3, "trips");
    expect(mocks.deleteEq).toHaveBeenCalledWith("id", tripId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.redirect).toHaveBeenCalledWith("/trips");
  });
});
