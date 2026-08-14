import { afterEach, describe, expect, it, vi } from "vitest";

import { isDevelopmentAuthenticationEnabled } from "@/features/auth/model/development-auth";
import { parseMagicLinkEmail } from "@/features/auth/model/magic-link";

describe("magic link email", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes a valid email address", () => {
    expect(parseMagicLinkEmail("  traveler@example.com ")).toEqual({
      success: true,
      data: "traveler@example.com",
    });
  });

  it("rejects absent and malformed email addresses", () => {
    expect(parseMagicLinkEmail(null).success).toBe(false);
    expect(parseMagicLinkEmail("not-an-email").success).toBe(false);
  });

  it("enables direct sign-in only during local development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(isDevelopmentAuthenticationEnabled()).toBe(true);
  });

  it("disables direct sign-in outside development", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(isDevelopmentAuthenticationEnabled()).toBe(false);
  });
});
