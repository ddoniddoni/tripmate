// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/model/auth-actions", () => ({
  requestMagicLink: vi.fn(),
  startDevelopmentSession: vi.fn(),
}));

import { LoginForm } from "@/features/auth/ui/login-form";

describe("LoginForm", () => {
  it("uses direct sign-in for development", () => {
    render(<LoginForm allowDevelopmentSession />);

    expect(screen.getByRole("button", { name: "이메일로 바로 시작하기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이메일 인증 링크 보내기" })).not.toBeInTheDocument();
  });

  it("uses email verification outside development", () => {
    render(<LoginForm allowDevelopmentSession={false} />);

    expect(screen.getByRole("button", { name: "이메일 인증 링크 보내기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이메일로 바로 시작하기" })).not.toBeInTheDocument();
  });
});
