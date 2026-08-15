import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  generateLink: vi.fn(),
  isDevelopmentAuthenticationEnabled: vi.fn(),
  redirect: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  verifyOtp: vi.fn(),
}));

const invitationToken = "a".repeat(43);
const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const dayId = "bbd0c1f9-a6e4-40b6-a320-4b5e35296c9a";
const tripEditorPath = `/trips/${tripId}?view=itinerary&day=${dayId}`;

vi.mock("@/features/auth/model/development-auth", () => ({
  isDevelopmentAuthenticationEnabled: mocks.isDevelopmentAuthenticationEnabled,
}));

vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/shared/config/public-env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

import { requestMagicLink, signOut, startDevelopmentSession } from "@/features/auth/model/auth-actions";
import { initialMagicLinkActionState } from "@/features/auth/model/magic-link";

function createEmailFormData() {
  const formData = new FormData();
  formData.set("email", "traveler@example.com");
  return formData;
}

function createInvitationEmailFormData() {
  const formData = createEmailFormData();
  formData.set("next", `/invites/${invitationToken}`);
  return formData;
}

function createTripEditorEmailFormData() {
  const formData = createEmailFormData();
  formData.set("next", tripEditorPath);
  return formData;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDevelopmentAuthenticationEnabled.mockReturnValue(true);
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { generateLink: mocks.generateLink } },
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithOtp: mocks.signInWithOtp,
        signOut: mocks.signOut,
        verifyOtp: mocks.verifyOtp,
      },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("sends a magic link when email verification is enabled", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });

    const result = await requestMagicLink(initialMagicLinkActionState, createEmailFormData());

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "traveler@example.com",
      options: { emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Ftrips" },
    });
    expect(result).toEqual({
      message: "로그인 링크를 보냈어요. 이메일에서 링크를 열어 계속해 주세요.",
      status: "success",
    });
  });

  it("creates a real Supabase session without sending an email in development", async () => {
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "hashed-token" } },
      error: null,
    });
    mocks.verifyOtp.mockResolvedValue({ error: null });

    await expect(startDevelopmentSession(initialMagicLinkActionState, createEmailFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.generateLink).toHaveBeenCalledWith({
      email: "traveler@example.com",
      type: "magiclink",
    });
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "hashed-token", type: "email" });
    expect(mocks.redirect).toHaveBeenCalledWith("/trips");
  });

  it("preserves an internal invitation path through both login methods", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "hashed-token" } },
      error: null,
    });
    mocks.verifyOtp.mockResolvedValue({ error: null });

    await requestMagicLink(initialMagicLinkActionState, createInvitationEmailFormData());
    await expect(
      startDevelopmentSession(initialMagicLinkActionState, createInvitationEmailFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "traveler@example.com",
      options: {
        emailRedirectTo: `http://localhost:3000/auth/confirm?next=%2Finvites%2F${invitationToken}`,
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(`/invites/${invitationToken}`);
  });

  it("preserves a safe trip editor path through both login methods", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "hashed-token" } },
      error: null,
    });
    mocks.verifyOtp.mockResolvedValue({ error: null });

    await requestMagicLink(initialMagicLinkActionState, createTripEditorEmailFormData());
    await expect(
      startDevelopmentSession(initialMagicLinkActionState, createTripEditorEmailFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "traveler@example.com",
      options: {
        emailRedirectTo: `http://localhost:3000/auth/confirm?next=${encodeURIComponent(tripEditorPath)}`,
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(tripEditorPath);
  });

  it("rejects direct sign-in outside development", async () => {
    mocks.isDevelopmentAuthenticationEnabled.mockReturnValue(false);

    const result = await startDevelopmentSession(initialMagicLinkActionState, createEmailFormData());

    expect(result.status).toBe("error");
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("signs out the real Supabase session", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
