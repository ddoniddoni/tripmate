import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseUserProfile: vi.fn(),
  listSupabaseTrips: vi.fn(),
  redirect: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/entities/trip/api/supabase-trip-repository", () => ({
  listSupabaseTrips: mocks.listSupabaseTrips,
}));
vi.mock("@/entities/user/api/supabase-profile-repository", () => ({
  getSupabaseUserProfile: mocks.getSupabaseUserProfile,
}));
vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import TripsPage from "@/app/trips/page";

const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";

describe("TripsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({});
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: userId });
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
  });

  it("redirects a user without a nickname before surfacing an unrelated trip list failure", async () => {
    mocks.getSupabaseUserProfile.mockResolvedValue({ displayName: null, id: userId });
    mocks.listSupabaseTrips.mockRejectedValue(new Error("trip query failed"));

    await expect(TripsPage()).rejects.toThrow("NEXT_REDIRECT:/profile");
    expect(mocks.redirect).toHaveBeenCalledWith("/profile");
  });

  it("uses one request-scoped Supabase client for authentication and page data", async () => {
    const requestClient = {};
    mocks.createSupabaseServerClient.mockResolvedValue(requestClient);
    mocks.getSupabaseUserProfile.mockResolvedValue({ displayName: "지우", id: userId });
    mocks.listSupabaseTrips.mockResolvedValue([]);

    await TripsPage();

    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mocks.getAuthenticatedUser).toHaveBeenCalledWith(requestClient);
    expect(mocks.getSupabaseUserProfile).toHaveBeenCalledWith(userId, requestClient);
    expect(mocks.listSupabaseTrips).toHaveBeenCalledWith(requestClient);
  });
});
