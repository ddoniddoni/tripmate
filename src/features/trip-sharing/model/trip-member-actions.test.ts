import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
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
    rpc: mocks.rpc,
  })),
}));

import {
  leaveTrip,
  removeTripMember,
  transferTripOwnership,
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

function createLeaveFormData() {
  const formData = new FormData();
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
    mocks.rpc.mockResolvedValue({ data: true, error: null });
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

  it("lets an editor or viewer remove only their own membership", async () => {
    await expect(leaveTrip(createLeaveFormData())).resolves.toEqual({
      message: "여행에서 나왔어요.",
      success: true,
    });

    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "trip_id", tripId);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "user_id", ownerId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
  });

  it("does not report a successful leave when RLS protects an owner membership", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(leaveTrip(createLeaveFormData())).resolves.toEqual({
      message: "여행에서 나가지 못했습니다. 소유자라면 먼저 다른 멤버에게 소유권을 넘겨 주세요.",
      success: false,
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("calls the protected ownership-transfer function with a different member", async () => {
    const formData = createRemovalFormData();

    await expect(transferTripOwnership(formData)).resolves.toEqual({
      message: "여행 소유권을 넘겼어요. 이제 필요하면 여행에서 나갈 수 있습니다.",
      success: true,
    });

    expect(mocks.rpc).toHaveBeenCalledWith("transfer_trip_ownership", {
      next_owner_id: memberId,
      target_trip_id: tripId,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
  });

  it("rejects a self-directed ownership transfer before calling the database", async () => {
    const formData = createRemovalFormData();
    formData.set("memberId", ownerId);

    await expect(transferTripOwnership(formData)).resolves.toEqual({
      message: "나 자신에게 소유권을 넘길 수 없습니다.",
      success: false,
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not report success when the ownership-transfer function refuses the request", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    await expect(transferTripOwnership(createRemovalFormData())).resolves.toEqual({
      message: "소유권을 넘기지 못했습니다. 멤버와 현재 권한을 다시 확인해 주세요.",
      success: false,
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
