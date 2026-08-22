import { describe, expect, it } from "vitest";

import {
  parseCredentials,
  parseEmail,
  parseSignUpCredentials,
} from "@/features/auth/model/credentials";

function createCredentialsFormData() {
  const formData = new FormData();
  formData.set("email", " traveler@example.com ");
  formData.set("password", "safe-password");

  return formData;
}

describe("email and password credentials", () => {
  it("normalizes a valid email address", () => {
    expect(parseEmail("  traveler@example.com ")).toEqual({
      success: true,
      data: "traveler@example.com",
    });
  });

  it("requires an email address and a password with at least eight characters", () => {
    const missingEmail = parseEmail(null);
    const shortPassword = createCredentialsFormData();
    shortPassword.set("password", "short");

    expect(missingEmail).toMatchObject({ success: false });
    if (!missingEmail.success) {
      expect(missingEmail.error.issues[0]?.message).toBe("이메일 주소를 입력해 주세요.");
    }
    expect(parseCredentials(shortPassword)).toMatchObject({ success: false });
  });

  it("requires matching passwords when signing up", () => {
    const formData = createCredentialsFormData();
    formData.set("passwordConfirmation", "different-password");

    const result = parseSignUpCredentials(formData);

    expect(result).toMatchObject({ success: false });
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("비밀번호가 서로 일치하지 않아요.");
    }
  });

  it("accepts matching credentials for sign-up", () => {
    const formData = createCredentialsFormData();
    formData.set("passwordConfirmation", "safe-password");

    expect(parseSignUpCredentials(formData)).toEqual({
      success: true,
      data: {
        email: "traveler@example.com",
        password: "safe-password",
        passwordConfirmation: "safe-password",
      },
    });
  });
});
