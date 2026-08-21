import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  memberEq: vi.fn(),
  memberMaybeSingle: vi.fn(),
  memberSelect: vi.fn(),
  revalidatePath: vi.fn(),
  remove: vi.fn(),
  storageFrom: vi.fn(),
  tripEq: vi.fn(),
  tripMaybeSingle: vi.fn(),
  tripSelect: vi.fn(),
  tripUpdate: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  })),
}));

import {
  removeTripCoverImage,
  updateTripCoverImage,
} from "@/features/trip-management/model/trip-cover-image-action";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const previousCoverImagePath = `${tripId}/9f1c1e54-12a1-49a9-bf5f-a95027e8bb5e.jpg`;
const nextCoverImagePath = `${tripId}/d0bff9ec-1c92-44f4-9884-5b4317d06ff0.webp`;

function prepareMocks() {
  const memberBuilder = {
    eq: mocks.memberEq,
    maybeSingle: mocks.memberMaybeSingle,
    select: mocks.memberSelect,
  };
  const tripReadBuilder = {
    eq: mocks.tripEq,
    maybeSingle: mocks.tripMaybeSingle,
    select: mocks.tripSelect,
  };
  const tripUpdateBuilder = {
    eq: mocks.updateEq,
  };

  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mocks.memberSelect.mockReturnValue(memberBuilder);
  mocks.memberEq.mockReturnValue(memberBuilder);
  mocks.memberMaybeSingle.mockResolvedValue({ data: { role: "owner" }, error: null });
  mocks.tripSelect.mockReturnValue(tripReadBuilder);
  mocks.tripEq.mockReturnValue(tripReadBuilder);
  mocks.tripMaybeSingle.mockResolvedValue({
    data: { cover_image_path: previousCoverImagePath, id: tripId },
    error: null,
  });
  mocks.tripUpdate.mockReturnValue(tripUpdateBuilder);
  mocks.updateEq.mockResolvedValue({ error: null });
  mocks.storageFrom.mockReturnValue({ remove: mocks.remove });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "trip_members") {
      return memberBuilder;
    }

    return {
      ...tripReadBuilder,
      update: mocks.tripUpdate,
    };
  });
}

describe("trip cover image actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareMocks();
  });

  it("updates an owner trip's cover and removes the replaced object", async () => {
    await expect(
      updateTripCoverImage({ coverImagePath: nextCoverImagePath, tripId }),
    ).resolves.toEqual({ message: "커버 사진을 저장했어요.", status: "success" });

    expect(mocks.tripUpdate).toHaveBeenCalledWith({ cover_image_path: nextCoverImagePath });
    expect(mocks.updateEq).toHaveBeenCalledWith("id", tripId);
    expect(mocks.storageFrom).toHaveBeenCalledWith("trip-covers");
    expect(mocks.remove).toHaveBeenCalledWith([previousCoverImagePath]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("rejects a cover path outside the requested trip folder", async () => {
    await expect(
      updateTripCoverImage({
        coverImagePath: `aaaaf6c0-8e85-4d2a-b77f-f2b15d1be3d8/d0bff9ec-1c92-44f4-9884-5b4317d06ff0.webp`,
        tripId,
      }),
    ).resolves.toEqual({ message: "커버 사진 정보를 확인해 주세요.", status: "error" });

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("explains when the cover-image database update has not been applied", async () => {
    mocks.tripMaybeSingle.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'cover_image_path' column of 'trips' in the schema cache",
      },
    });

    await expect(
      updateTripCoverImage({ coverImagePath: nextCoverImagePath, tripId }),
    ).resolves.toEqual({
      message:
        "커버 사진 기능을 사용하려면 Supabase 데이터베이스 업데이트를 먼저 적용해 주세요.",
      status: "error",
    });
  });

  it("clears the database reference before removing the old storage object", async () => {
    await expect(removeTripCoverImage(tripId)).resolves.toEqual({
      message: "커버 사진을 삭제했어요.",
      status: "success",
    });

    expect(mocks.tripUpdate).toHaveBeenCalledWith({ cover_image_path: null });
    expect(mocks.remove).toHaveBeenCalledWith([previousCoverImagePath]);
  });
});
