import {
  aiItineraryPlanResponseSchema,
  type AiItineraryPlan,
} from "@/features/ai-itinerary/model/ai-itinerary-plan";

const aiItineraryPath = "/api/ai-itinerary";

async function getErrorMessage(response: Response) {
  const payload: unknown = await response.json().catch(() => null);

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message;
  }

  return "AI 동선 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function requestAiItineraryPlan(tripId: string): Promise<AiItineraryPlan> {
  const response = await fetch(aiItineraryPath, {
    body: JSON.stringify({ tripId }),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload: unknown = await response.json().catch(() => null);
  const parsedPayload = aiItineraryPlanResponseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new Error("AI 동선 결과를 처리하지 못했습니다. 다시 만들어 주세요.");
  }

  return parsedPayload.data.plan;
}
