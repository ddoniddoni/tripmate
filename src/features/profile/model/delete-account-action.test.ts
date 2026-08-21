import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminDeleteUser: vi.fn(),
  authGetUser: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  revalidatePath: vi.fn(),
  select: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));
vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: { admin: { deleteUser: mocks.adminDeleteUser } },
  })),
}));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser, signOut: mocks.signOut },
    from: mocks.from,
  })),
}));

import { deleteAccount } from "@/features/profile/model/delete-account-action";
import { initialDeleteAccountActionState } from "@/features/profile/model/delete-account-action-state";

const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

function createFormData(confirmation = "탈퇴") {
  const formData = new FormData();
  formData.set("confirmation", confirmation);
  return formData;
}

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ count: 0, error: null });
    mocks.adminDeleteUser.mockResolvedValue({ data: { user: {} }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("requires explicit confirmation before any account deletion query", async () => {
    await expect(deleteAccount(initialDeleteAccountActionState, createFormData("삭제"))).resolves.toEqual({
      message: "계속하려면 탈퇴를 정확히 입력해 주세요.",
      status: "error",
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.adminDeleteUser).not.toHaveBeenCalled();
  });

  it("keeps shared travel safe by blocking account deletion for trip owners", async () => {
    mocks.eq.mockResolvedValue({ count: 2, error: null });

    await expect(deleteAccount(initialDeleteAccountActionState, createFormData())).resolves.toEqual({
      message: "소유한 여행이 2개 있어요. 먼저 다른 멤버에게 소유권을 넘기거나 여행을 삭제해 주세요.",
      status: "error",
    });

    expect(mocks.adminDeleteUser).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated user after checking owned trips", async () => {
    await expect(deleteAccount(initialDeleteAccountActionState, createFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/login?deleted=1",
    );

    expect(mocks.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", userId);
    expect(mocks.adminDeleteUser).toHaveBeenCalledWith(userId);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
  });
});
