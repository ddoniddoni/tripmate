import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
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

import { revokeTripInvitation } from "@/features/trip-sharing/model/trip-invitation-actions";

const invitationId = "791fa61b-fd1e-4f09-a331-e0816e32728d";
const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

function createFormData() {
  const formData = new FormData();
  formData.set("invitationId", invitationId);
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
  });

  it("checks authentication before rejecting malformed data", async () => {
    const result = await revokeTripInvitation(new FormData());

    expect(result.success).toBe(false);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated requests before attempting a deletion", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(revokeTripInvitation(createFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes only the requested invitation and revalidates its trip", async () => {
    const result = await revokeTripInvitation(createFormData());

    expect(result).toEqual({ message: "대기 중인 초대를 취소했습니다.", success: true });
    expect(mocks.from).toHaveBeenCalledWith("trip_invitations");
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", invitationId);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "trip_id", tripId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("does not report success when RLS prevents the deletion", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await revokeTripInvitation(createFormData());

    expect(result.success).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
