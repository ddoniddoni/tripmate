// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requestAiItineraryPlan: vi.fn() }));

vi.mock("@/features/ai-itinerary/api/ai-itinerary-api-adapter", () => ({
  requestAiItineraryPlan: mocks.requestAiItineraryPlan,
}));

import { AiItineraryPlannerDialog } from "@/features/ai-itinerary/ui/ai-itinerary-planner-dialog";

const trip = {
  destination: "대한민국 · 부산",
  endDate: "2026-10-11",
  id: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
  startDate: "2026-10-10",
  timeZone: "Asia/Seoul",
  title: "가을의 부산",
};

const plan = {
  days: [
    {
      date: "2026-10-10",
      routeTip: "해운대와 광안리를 같은 날에 이어 보세요.",
      stops: [
        { area: "해운대", description: "바다를 따라 천천히 시작해 보세요.", period: "morning" },
        { area: "광안리", description: "해 질 무렵 풍경을 즐겨 보세요.", period: "evening" },
      ],
      theme: "바다와 야경을 잇는 첫날",
    },
    {
      date: "2026-10-11",
      routeTip: "원도심 권역을 한 번에 둘러보세요.",
      stops: [
        { area: "감천문화마을", description: "골목을 여유 있게 둘러보세요.", period: "morning" },
        { area: "남포동", description: "시장과 항구 산책을 이어 보세요.", period: "afternoon" },
      ],
      theme: "골목과 항구를 걷는 둘째 날",
    },
  ],
  overview: "바다와 원도심을 나눠 둘러보는 1박 2일 부산 초안이에요.",
  routeRationale: "가까운 권역을 하루에 묶어 되돌아가는 이동을 줄였어요.",
};

describe("AiItineraryPlannerDialog", () => {
  it("shows a route draft only after an editor requests it", async () => {
    mocks.requestAiItineraryPlan.mockResolvedValue({ plan, source: "mock" });
    const user = userEvent.setup();

    render(<AiItineraryPlannerDialog trip={trip} />);

    await user.click(screen.getByRole("button", { name: "AI 동선 추천" }));
    expect(screen.getByRole("dialog", { name: "여행 동선 초안" })).toBeVisible();
    expect(screen.getByText("장소 검색")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "AI 동선 만들기" }));

    expect(mocks.requestAiItineraryPlan).toHaveBeenCalledWith(trip.id);
    expect(screen.getByText("바다와 야경을 잇는 첫날")).toBeVisible();
    expect(screen.getByText("해운대")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("개발용 미리보기");
    expect(screen.getByText("새 초안 만들기")).toBeVisible();
  });

  it("lets an editor bring a generated draft into the shared day memos", async () => {
    mocks.requestAiItineraryPlan.mockResolvedValue({ plan, source: "ai" });
    const onApplyPlan = vi.fn().mockReturnValue({
      success: true,
      importedDayCount: 2,
      preservedDayCount: 0,
      unmatchedDayCount: 0,
    });
    const user = userEvent.setup();

    render(<AiItineraryPlannerDialog onApplyPlan={onApplyPlan} trip={trip} />);

    await user.click(screen.getByRole("button", { name: "AI 동선 추천" }));
    await user.click(screen.getByRole("button", { name: "AI 동선 만들기" }));
    await user.click(screen.getByRole("button", { name: "일정 메모로 가져오기" }));

    expect(onApplyPlan).toHaveBeenCalledWith(plan);
    expect(screen.getByRole("status")).toHaveTextContent("초안을 2일차의 공유 메모에 추가했어요.");
    expect(screen.getByText("새 초안 만들기")).toBeVisible();
  });
});
