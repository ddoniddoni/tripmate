import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));

const invitationToken = "a".repeat(43);
const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const dayId = "bbd0c1f9-a6e4-40b6-a320-4b5e35296c9a";
const tripEditorPath = `/trips/${tripId}?view=itinerary&day=${dayId}`;

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/shared/config/public-env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/features/auth/model/auth-actions";
import { initialAuthActionState } from "@/features/auth/model/credentials";

function createEmailFormData(nextPath?: string) {
  const formData = new FormData();
  formData.set("email", "traveler@example.com");

  if (nextPath) {
    formData.set("next", nextPath);
  }

  return formData;
}

function createCredentialsFormData(nextPath?: string) {
  const formData = createEmailFormData(nextPath);
  formData.set("password", "safe-password");

  return formData;
}

function createSignUpFormData(nextPath?: string) {
  const formData = createCredentialsFormData(nextPath);
  formData.set("passwordConfirmation", "safe-password");

  return formData;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
        signUp: mocks.signUp,
      },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("signs in with an email and password", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    await expect(signInWithPassword(initialAuthActionState, createCredentialsFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "traveler@example.com",
      password: "safe-password",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/trips");
  });

  it("redirects to the email confirmation page after starting sign-up", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });

    await expect(signUpWithPassword(initialAuthActionState, createSignUpFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "traveler@example.com",
      password: "safe-password",
      options: { emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Ftrips" },
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/signup/check-email");
  });

  it("starts a session immediately when email confirmation is disabled", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });

    await expect(signUpWithPassword(initialAuthActionState, createSignUpFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/trips");
  });

  it("preserves an internal invitation path through password sign-in", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const nextPath = `/invites/${invitationToken}`;

    await expect(signInWithPassword(initialAuthActionState, createCredentialsFormData(nextPath))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "traveler@example.com",
      password: "safe-password",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(nextPath);
  });

  it("preserves a safe trip editor path through password sign-in", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    await expect(
      signInWithPassword(initialAuthActionState, createCredentialsFormData(tripEditorPath)),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "traveler@example.com",
      password: "safe-password",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(tripEditorPath);
  });

  it("signs out the real Supabase session", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
