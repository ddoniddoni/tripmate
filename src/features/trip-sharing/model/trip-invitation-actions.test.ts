import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  rpc: vi.fn(),
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
    rpc: mocks.rpc,
  })),
}));

import {
  createTripInvitation,
  revokeTripInvitation,
} from "@/features/trip-sharing/model/trip-invitation-actions";
import { initialCreateTripInvitationActionState } from "@/features/trip-sharing/model/trip-invitation-action-state";

const invitationId = "791fa61b-fd1e-4f09-a331-e0816e32728d";
const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

function createRevokeFormData() {
  const formData = new FormData();
  formData.set("invitationId", invitationId);
  formData.set("tripId", tripId);
  return formData;
}

function createInvitationFormData() {
  const formData = new FormData();
  formData.set("email", "friend@example.com");
  formData.set("role", "editor");
  formData.set("tripId", tripId);
  return formData;
}

describe("revokeTripInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      delete: mocks.delete,
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
      select: mocks.select,
    };

    mocks.getUser.mockResolvedValue({ data: { user: { id: invitationId } }, error: null });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.from.mockReturnValue(builder);
    mocks.delete.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({ data: { id: invitationId }, error: null });
    mocks.rpc.mockResolvedValue({ data: invitationId, error: null });
  });

  it("checks authentication before rejecting malformed data", async () => {
    const result = await revokeTripInvitation(new FormData());

    expect(result.success).toBe(false);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated requests before attempting a deletion", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(revokeTripInvitation(createRevokeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes only the requested invitation and revalidates its trip", async () => {
    const result = await revokeTripInvitation(createRevokeFormData());

    expect(result).toEqual({ message: "대기 중인 초대를 취소했습니다.", success: true });
    expect(mocks.from).toHaveBeenCalledWith("trip_invitations");
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", invitationId);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "trip_id", tripId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("does not report success when RLS prevents the deletion", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await revokeTripInvitation(createRevokeFormData());

    expect(result.success).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("createTripInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: invitationId } }, error: null });
    mocks.rpc.mockResolvedValue({ data: invitationId, error: null });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("sends an invitation directly to a registered TripMate account", async () => {
    const result = await createTripInvitation(
      initialCreateTripInvitationActionState,
      createInvitationFormData(),
    );

    expect(result).toEqual({
      message: "friend@example.com님에게 초대를 보냈어요. 알림에서 바로 확인할 수 있어요.",
      status: "success",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("create_trip_invitation_for_registered_user", {
      target_email: "friend@example.com",
      target_role: "editor",
      target_trip_id: tripId,
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("explains when the email does not belong to a registered account", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "INVITEE_NOT_FOUND" },
    });

    const result = await createTripInvitation(
      initialCreateTripInvitationActionState,
      createInvitationFormData(),
    );

    expect(result).toEqual({
      message: "아직 TripMate에 가입하지 않은 이메일이에요.",
      status: "error",
    });
  });
});
