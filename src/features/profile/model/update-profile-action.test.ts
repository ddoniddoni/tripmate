import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }) }));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
    from: mocks.from,
  })),
}));

import { updateProfileDisplayName } from "@/features/profile/model/update-profile-action";

const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

function createFormData(displayName = "지우", nextPath = "/trips") {
  const formData = new FormData();
  formData.set("displayName", displayName);
  formData.set("next", nextPath);
  return formData;
}

describe("updateProfileDisplayName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { id: userId }, error: null });
  });

  it("updates only the authenticated user's display name and revalidates profile consumers", async () => {
    await expect(updateProfileDisplayName(createFormData("  지우  "))).resolves.toEqual({
      message: "닉네임을 저장했어요.",
      status: "success",
    });

    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.update).toHaveBeenCalledWith({ display_name: "지우" });
    expect(mocks.eq).toHaveBeenCalledWith("id", userId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
  });

  it("revalidates a safe settings destination after saving", async () => {
    const settingsPath = "/trips/d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8?view=settings";

    await updateProfileDisplayName(createFormData("지우", settingsPath));

    expect(mocks.revalidatePath).toHaveBeenCalledWith(settingsPath);
  });

  it("rejects an empty name after authentication without mutating", async () => {
    await expect(updateProfileDisplayName(createFormData(" "))).resolves.toMatchObject({
      status: "error",
    });

    expect(mocks.authGetUser).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not report success when RLS returns no updated profile", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(updateProfileDisplayName(createFormData())).resolves.toEqual({
      message: "닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });
});
