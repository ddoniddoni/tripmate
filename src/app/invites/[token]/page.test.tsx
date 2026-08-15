// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getInvitation: vi.fn(),
  getProfile: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: mocks.redirect,
}));

vi.mock("@/entities/trip/api/supabase-trip-repository", () => ({
  getSupabaseTripInvitationPreview: mocks.getInvitation,
}));

vi.mock("@/entities/user/api/supabase-profile-repository", () => ({
  getSupabaseUserProfile: mocks.getProfile,
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/features/auth/ui/sign-out-button", () => ({
  SignOutButton: () => <button type="button">계정 바꾸기</button>,
}));

vi.mock("@/features/trip-sharing/ui/accept-trip-invitation-form", () => ({
  AcceptTripInvitationForm: () => <button type="button">여행에 참여하기</button>,
}));

vi.mock("@/shared/ui/brand-mark", () => ({
  BrandMark: () => <span>TripMate</span>,
}));

import InvitationPage from "@/app/invites/[token]/page";

const token = "a".repeat(43);

describe("InvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "friend@example.com", id: "user-id" });
    mocks.getProfile.mockResolvedValue({ displayName: "친구", id: "user-id" });
    mocks.getInvitation.mockResolvedValue({
      expiresAt: "2099-07-01T00:00:00.000Z",
      role: "editor",
      trip: {
        destination: "제주",
        endDate: "2099-07-03",
        id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
        startDate: "2099-07-01",
        timeZone: "Asia/Seoul",
        title: "여름 제주 여행",
      },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("shows the invited trip and recipient role before acceptance", async () => {
    render(await InvitationPage({ params: Promise.resolve({ token }) }));

    expect(screen.getByRole("heading", { name: "여름 제주 여행 여행에 초대받았어요" })).toBeInTheDocument();
    expect(screen.getByText("제주")).toBeInTheDocument();
    expect(screen.getByText("편집 가능")).toBeInTheDocument();
    expect(screen.getByText("일정, 준비 항목, 경비를 함께 수정할 수 있어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여행에 참여하기" })).toBeInTheDocument();
  });

  it("returns a profile-less invitee to profile setup without losing the invitation", async () => {
    mocks.getProfile.mockResolvedValue({ displayName: null, id: "user-id" });

    await expect(InvitationPage({ params: Promise.resolve({ token }) })).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith(`/profile?next=${encodeURIComponent(`/invites/${token}`)}`);
    expect(mocks.getInvitation).not.toHaveBeenCalled();
  });

  it("offers an account change path for an unusable invitation", async () => {
    mocks.getInvitation.mockResolvedValue(null);

    render(await InvitationPage({ params: Promise.resolve({ token }) }));

    expect(screen.getByRole("heading", { name: "이 초대를 확인할 수 없어요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계정 바꾸기" })).toBeInTheDocument();
  });
});
