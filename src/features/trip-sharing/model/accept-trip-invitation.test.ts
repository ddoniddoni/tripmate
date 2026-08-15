import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
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

import { initialAcceptTripInvitationActionState } from "@/features/trip-sharing/model/trip-invitation-action-state";
import { acceptTripInvitation } from "@/features/trip-sharing/model/trip-invitation-actions";

const invitationId = "791fa61b-fd1e-4f09-a331-e0816e32728d";
const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const token = "a".repeat(43);

function createFormData(value = token) {
  const formData = new FormData();
  formData.set("token", value);
  return formData;
}

describe("acceptTripInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const invitationBuilder = {
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
      select: mocks.select,
    };
    const acceptanceBuilder = { insert: mocks.insert };

    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.from.mockImplementation((table: string) =>
      table === "trip_invitations" ? invitationBuilder : acceptanceBuilder,
    );
    mocks.select.mockReturnValue(invitationBuilder);
    mocks.eq.mockReturnValue(invitationBuilder);
    mocks.maybeSingle.mockResolvedValue({ data: { id: invitationId, trip_id: tripId }, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("checks authentication before processing a malformed token", async () => {
    const result = await acceptTripInvitation(initialAcceptTripInvitationActionState, createFormData("bad"));

    expect(result.status).toBe("error");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("creates an acceptance for the authenticated user then opens the shared trip", async () => {
    await expect(
      acceptTripInvitation(initialAcceptTripInvitationActionState, createFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.from).toHaveBeenNthCalledWith(1, "trip_invitations");
    expect(mocks.eq).toHaveBeenCalledWith(
      "token_hash",
      createHash("sha256").update(token).digest("hex"),
    );
    expect(mocks.from).toHaveBeenNthCalledWith(2, "trip_invitation_acceptances");
    expect(mocks.insert).toHaveBeenCalledWith({ invitation_id: invitationId, user_id: userId });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
    expect(mocks.redirect).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("does not create a membership acceptance when the invitation lookup is unavailable", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await acceptTripInvitation(initialAcceptTripInvitationActionState, createFormData());

    expect(result).toEqual({
      message: "초대 링크가 만료되었거나 다른 이메일 주소로 발급되었습니다.",
      status: "error",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
