import { describe, expect, it } from "vitest";

import { parseProfileDisplayNameFormData, userProfileSchema } from "@/entities/user/model/profile";

describe("user profile", () => {
  it("normalizes a display name submitted from the profile form", () => {
    const formData = new FormData();
    formData.set("displayName", "  지우  ");

    expect(parseProfileDisplayNameFormData(formData)).toMatchObject({
      data: "지우",
      success: true,
    });
  });

  it("keeps an unset database display name nullable but rejects blank submissions", () => {
    const formData = new FormData();
    formData.set("displayName", "   ");

    expect(userProfileSchema.parse({
      displayName: null,
      id: "b37aa707-35d7-4d7d-a8c5-b5ea8c703673",
    })).toMatchObject({ displayName: null });
    expect(parseProfileDisplayNameFormData(formData).success).toBe(false);
  });
});
