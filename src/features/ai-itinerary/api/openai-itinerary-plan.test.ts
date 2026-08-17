import { afterEach, describe, expect, it, vi } from "vitest";

import {
  generateOpenAiItineraryPlan,
  OpenAiItineraryPlanError,
} from "@/features/ai-itinerary/api/openai-itinerary-plan";

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

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.unstubAllGlobals();
});

describe("generateOpenAiItineraryPlan", () => {
  it("does not call the provider when the server-only key is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateOpenAiItineraryPlan(trip)).rejects.toMatchObject({
      kind: "configuration",
      message: "AI 동선 추천 설정이 아직 완료되지 않았습니다.",
    } satisfies Partial<OpenAiItineraryPlanError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests a strict JSON route draft and validates the returned day dates", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [{ text: JSON.stringify(plan), type: "output_text" }],
              type: "message",
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateOpenAiItineraryPlan(trip)).resolves.toEqual(plan);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")).toMatchObject({
      model: "gpt-5-mini",
      text: {
        format: {
          strict: true,
          type: "json_schema",
        },
      },
    });
  });

  it("rejects a model draft that does not match the trip dates", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    text: JSON.stringify({
                      ...plan,
                      days: [{ ...plan.days[0], date: "2026-10-09" }, plan.days[1]],
                    }),
                    type: "output_text",
                  },
                ],
                type: "message",
              },
            ],
          }),
        ),
      ),
    );

    await expect(generateOpenAiItineraryPlan(trip)).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<OpenAiItineraryPlanError>);
  });
});
