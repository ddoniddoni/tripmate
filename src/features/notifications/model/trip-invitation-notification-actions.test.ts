import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  })),
}));

import { initialTripInvitationNotificationActionState } from "@/features/notifications/model/trip-invitation-notification-action-state";
import { respondToTripInvitation } from "@/features/notifications/model/trip-invitation-notification-actions";
import * as tripInvitationNotificationActionExports from "@/features/notifications/model/trip-invitation-notification-actions";

const invitationId = "791fa61b-fd1e-4f09-a331-e0816e32728d";
const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

function createFormData(response: "accepted" | "declined") {
  const formData = new FormData();
  formData.set("invitationId", invitationId);
  formData.set("response", response);
  return formData;
}

describe("respondToTripInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.rpc.mockResolvedValue({ data: tripId, error: null });
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("exports only async functions from the use server module", () => {
    expect(
      Object.values(tripInvitationNotificationActionExports).every(
        (value) => typeof value === "function" && value.constructor.name === "AsyncFunction",
      ),
    ).toBe(true);
  });

  it("accepts the invitation for the authenticated recipient and opens the trip", async () => {
    await expect(
      respondToTripInvitation(
        initialTripInvitationNotificationActionState,
        createFormData("accepted"),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/trips/${tripId}`);

    expect(mocks.rpc).toHaveBeenCalledWith("respond_to_trip_invitation", {
      invitation_response: "accepted",
      target_invitation_id: invitationId,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notifications");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("declines the invitation without navigating away from notifications", async () => {
    await expect(
      respondToTripInvitation(
        initialTripInvitationNotificationActionState,
        createFormData("declined"),
      ),
    ).resolves.toEqual({ message: "초대를 거절했어요.", status: "success" });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notifications");
  });

  it("does not call the response function with malformed input", async () => {
    const result = await respondToTripInvitation(
      initialTripInvitationNotificationActionState,
      new FormData(),
    );

    expect(result).toEqual({ message: "처리할 초대를 다시 확인해 주세요.", status: "error" });
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
