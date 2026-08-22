// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/model/auth-actions", () => ({
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));

import { LoginForm } from "@/features/auth/ui/login-form";

describe("LoginForm", () => {
  it("uses email and password sign-in in every environment", () => {
    render(<LoginForm nextPath="/trips" />);

    expect(screen.getByRole("button", { name: "로그인하기" })).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "처음이신가요? 회원가입" })).toBeInTheDocument();
  });

  it("collects matching password confirmation when signing up", async () => {
    const user = userEvent.setup();
    render(<LoginForm nextPath="/trips" />);

    await user.click(screen.getByRole("button", { name: "처음이신가요? 회원가입" }));

    expect(screen.getByRole("button", { name: "회원가입하기" })).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAttribute("autocomplete", "new-password");
  });
});
