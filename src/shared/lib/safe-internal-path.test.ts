import { describe, expect, it } from "vitest";

import { getSafeInternalPath } from "@/shared/lib/safe-internal-path";

describe("getSafeInternalPath", () => {
  it("keeps an invitation destination with a valid token", () => {
    const invitationPath = `/invites/${"a".repeat(43)}`;

    expect(getSafeInternalPath(invitationPath)).toBe(invitationPath);
  });

  it("rejects external, unrelated, and malformed invitation destinations", () => {
    expect(getSafeInternalPath("https://example.com")).toBe("/trips");
    expect(getSafeInternalPath("//example.com")).toBe("/trips");
    expect(getSafeInternalPath("/\\example.com")).toBe("/trips");
    expect(getSafeInternalPath("/login")).toBe("/trips");
    expect(getSafeInternalPath("/invites/not-a-valid-token")).toBe("/trips");
  });
});
