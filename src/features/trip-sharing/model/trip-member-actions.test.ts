import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
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

import {
  removeTripMember,
  updateTripMemberRole,
} from "@/features/trip-sharing/model/trip-member-actions";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const ownerId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const memberId = "791fa61b-fd1e-4f09-a331-e0816e32728d";

function createRoleFormData() {
  const formData = new FormData();
  formData.set("memberId", memberId);
  formData.set("role", "viewer");
  formData.set("tripId", tripId);
  return formData;
}

function createRemovalFormData() {
  const formData = new FormData();
  formData.set("memberId", memberId);
  formData.set("tripId", tripId);
  return formData;
}

describe("trip member actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      delete: mocks.delete,
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
      select: mocks.select,
      update: mocks.update,
    };

    mocks.getUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null });
    mocks.from.mockReturnValue(builder);
    mocks.update.mockReturnValue(builder);
    mocks.delete.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: memberId }, error: null });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("requires authentication before changing a role", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(updateTripMemberRole(createRoleFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("updates another member role and revalidates the trip", async () => {
    await expect(updateTripMemberRole(createRoleFormData())).resolves.toEqual({
      message: "멤버 권한을 변경했어요.",
      success: true,
    });

    expect(mocks.from).toHaveBeenCalledWith("trip_members");
    expect(mocks.update).toHaveBeenCalledWith({ role: "viewer" });
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "trip_id", tripId);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "user_id", memberId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("refuses a self-directed role change before querying memberships", async () => {
    const formData = createRoleFormData();
    formData.set("memberId", ownerId);

    await expect(updateTripMemberRole(formData)).resolves.toEqual({
      message: "내 소유자 권한은 이곳에서 변경할 수 없습니다.",
      success: false,
    });

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("removes another member only when the protected delete returns a row", async () => {
    await expect(removeTripMember(createRemovalFormData())).resolves.toEqual({
      message: "멤버를 여행에서 제외했어요.",
      success: true,
    });

    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "trip_id", tripId);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "user_id", memberId);
  });

  it("does not report removal success when RLS rejects the request", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(removeTripMember(createRemovalFormData())).resolves.toEqual({
      message: "멤버를 제외하지 못했습니다. 소유자 권한을 다시 확인해 주세요.",
      success: false,
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
