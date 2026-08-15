import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allow: vi.fn(),
  authorize: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  listSupabaseTripMembers: vi.fn(),
  Liveblocks: vi.fn(),
  prepareSession: vi.fn(),
}));

vi.mock("@/entities/trip/api/supabase-trip-repository", () => ({
  listSupabaseTripMembers: mocks.listSupabaseTripMembers,
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: mocks.Liveblocks,
}));

import { POST } from "@/app/api/liveblocks-auth/route";

const tripId = "77d8ae37-653c-4e6b-a47a-7d3373f0111f";
const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const originalSecret = process.env.LIVEBLOCKS_SECRET_KEY;

function createRequest(room: string) {
  return new Request("http://localhost/api/liveblocks-auth", {
    body: JSON.stringify({ room }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/liveblocks-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_liveblocks";
    mocks.Liveblocks.mockImplementation(function LiveblocksMock() {
      return { prepareSession: mocks.prepareSession };
    });
    mocks.prepareSession.mockReturnValue({
      allow: mocks.allow,
      authorize: mocks.authorize,
    });
    mocks.authorize.mockResolvedValue({ body: "access-token", status: 200 });
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: userId });
    mocks.listSupabaseTripMembers.mockResolvedValue([{ displayName: "지우", role: "editor", userId }]);
  });

  afterAll(() => {
    if (originalSecret) {
      process.env.LIVEBLOCKS_SECRET_KEY = originalSecret;
      return;
    }

    delete process.env.LIVEBLOCKS_SECRET_KEY;
  });

  it("rejects malformed room ids before checking authentication", async () => {
    const response = await POST(createRequest("trip:not-a-uuid"));

    expect(response.status).toBe(400);
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("requires a logged-in user", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(createRequest(`trip:${tripId}`));

    expect(response.status).toBe(401);
    expect(mocks.listSupabaseTripMembers).not.toHaveBeenCalled();
  });

  it("refuses users who are not trip members", async () => {
    mocks.listSupabaseTripMembers.mockResolvedValue([]);

    const response = await POST(createRequest(`trip:${tripId}`));

    expect(response.status).toBe(403);
    expect(mocks.prepareSession).not.toHaveBeenCalled();
  });

  it("grants a viewer read-only access to only the requested trip room", async () => {
    mocks.listSupabaseTripMembers.mockResolvedValue([{ displayName: "지우", role: "viewer", userId }]);

    const response = await POST(createRequest(`trip:${tripId}`));

    expect(response.status).toBe(200);
    expect(mocks.prepareSession).toHaveBeenCalledWith(userId, {
      userInfo: expect.objectContaining({
        name: "지우",
        role: "viewer",
      }),
    });
    expect(mocks.allow).toHaveBeenCalledWith(`trip:${tripId}`, ["*:read"]);
    expect(mocks.authorize).toHaveBeenCalledOnce();
  });

  it("grants write access to an editor", async () => {
    const response = await POST(createRequest(`trip:${tripId}`));

    expect(response.status).toBe(200);
    expect(mocks.allow).toHaveBeenCalledWith(`trip:${tripId}`, ["*:write"]);
  });

  it("falls back to the email name for a legacy profile without a nickname", async () => {
    mocks.listSupabaseTripMembers.mockResolvedValue([{ displayName: null, role: "editor", userId }]);

    await POST(createRequest(`trip:${tripId}`));

    expect(mocks.prepareSession).toHaveBeenCalledWith(userId, {
      userInfo: expect.objectContaining({ name: "traveler" }),
    });
  });
});
