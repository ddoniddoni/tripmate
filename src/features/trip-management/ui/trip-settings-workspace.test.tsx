// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TripSettingsWorkspace } from "@/features/trip-management/ui/trip-settings-workspace";

const trip = {
  destination: "대한민국 · 부산",
  endDate: "2026-10-12",
  id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
  startDate: "2026-10-10",
  timeZone: "Asia/Seoul",
  title: "가을의 부산",
};

describe("TripSettingsWorkspace", () => {
  it("groups trip information, member management, and deletion into settings", () => {
    render(
      <TripSettingsWorkspace
        coverControl={<button type="button">사진 올리기</button>}
        deletionControl={<button type="button">여행 삭제</button>}
        memberCount={3}
        permissions={{
          canDeleteTrip: true,
          canEditItinerary: true,
          canManageMembers: true,
          canUpdateTrip: true,
        }}
        sharingControl={<button type="button">멤버 관리</button>}
        trip={trip}
        tripDetailsControl={<button type="button">여행 정보 수정</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "여행을 관리해요" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "여행 정보" })).toBeInTheDocument();
    expect(screen.getByText("대한민국 · 부산")).toBeInTheDocument();
    expect(screen.getByText("10월 10일–12일 · 2박 3일")).toBeInTheDocument();
    expect(screen.getByText("Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByText("현재 3명")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "여행 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여행 정보 수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사진 올리기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "멤버 관리" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여행 삭제" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 프로필" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "회원 탈퇴" })).not.toBeInTheDocument();
  });

  it("explains restricted owner actions without rendering their controls", () => {
    render(
      <TripSettingsWorkspace
        coverControl={<span>커버 사진 변경은 소유자만 할 수 있어요.</span>}
        deletionControl={<button type="button">여행 삭제</button>}
        memberCount={2}
        permissions={{
          canDeleteTrip: false,
          canEditItinerary: false,
          canManageMembers: false,
          canUpdateTrip: false,
        }}
        sharingControl={<button type="button">멤버 관리</button>}
        trip={trip}
        tripDetailsControl={<button type="button">여행 정보 수정</button>}
      />,
    );

    expect(screen.getByText("여행 정보 수정은 소유자만 할 수 있어요.")).toBeInTheDocument();
    expect(screen.getByText("커버 사진 변경은 소유자만 할 수 있어요.")).toBeInTheDocument();
    expect(screen.getByText("여행 삭제는 소유자만 할 수 있어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "여행 정보 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "여행 삭제" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "멤버 관리" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "회원 탈퇴" })).not.toBeInTheDocument();
  });
});
