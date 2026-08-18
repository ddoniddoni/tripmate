import type { Trip } from "@/entities/trip/model/trip";
import {
  aiItineraryPlanSchema,
  getAiItineraryPlanJsonSchema,
  getAiItineraryTripDates,
  validateAiItineraryPlanForTrip,
  type AiItineraryPlan,
} from "@/features/ai-itinerary/model/ai-itinerary-plan";

type OpenAiResponse = {
  output?: unknown;
};

const AI_ITINERARY_MODEL = "gpt-5-mini";

export function isOpenAiItineraryPlanConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export class OpenAiItineraryPlanError extends Error {
  constructor(
    public readonly kind: "configuration" | "invalid-response" | "provider" | "trip-too-long",
  ) {
    super(
      kind === "configuration"
        ? "AI 동선 추천 설정이 아직 완료되지 않았습니다."
        : kind === "trip-too-long"
          ? "AI 동선 추천은 최대 14일 여행까지 만들 수 있어요."
          : "AI 동선 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
    this.name = "OpenAiItineraryPlanError";
  }
}

function getOutputText(response: OpenAiResponse) {
  if (!Array.isArray(response.output)) {
    return null;
  }

  for (const outputItem of response.output) {
    if (!outputItem || typeof outputItem !== "object" || !("content" in outputItem)) {
      continue;
    }

    const content = outputItem.content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (
        contentItem &&
        typeof contentItem === "object" &&
        "type" in contentItem &&
        contentItem.type === "output_text" &&
        "text" in contentItem &&
        typeof contentItem.text === "string"
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function createInstructions() {
  return [
    "You are a Korean travel route planner for TripMate.",
    "Write every user-facing field in natural Korean.",
    "Create a geographically coherent, high-level route draft that reduces backtracking.",
    "Use broadly known districts, neighborhoods, landmarks, or activity types only.",
    "Do not invent business names, addresses, exact opening hours, reservation availability, ticket prices, transport timetables, or precise travel times.",
    "The plan is inspiration only. It must not claim to have verified current local information.",
    "Return exactly the requested JSON schema with no markdown.",
  ].join(" ");
}

function createInput(trip: Trip, tripDates: readonly string[]) {
  return [
    `여행 이름: ${trip.title}`,
    `여행지: ${trip.destination}`,
    `여행 기간: ${trip.startDate} ~ ${trip.endDate}`,
    `반드시 아래 날짜 순서대로 하루 하나씩 동선 초안을 작성하세요: ${tripDates.join(", ")}.`,
    "각 날짜에는 오전·오후·저녁 중 두세 구간을 제안하고, 실제 장소를 선택하기 전에 사용자가 별도로 검색해야 한다는 전제를 지키세요.",
  ].join("\n");
}

export async function generateOpenAiItineraryPlan(trip: Trip): Promise<AiItineraryPlan> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!isOpenAiItineraryPlanConfigured() || !apiKey) {
    throw new OpenAiItineraryPlanError("configuration");
  }

  const tripDates = getAiItineraryTripDates(trip);

  if (tripDates.length > 14) {
    throw new OpenAiItineraryPlanError("trip-too-long");
  }

  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: createInput(trip, tripDates),
        instructions: createInstructions(),
        model: AI_ITINERARY_MODEL,
        text: {
          format: {
            name: "tripmate_itinerary_plan",
            schema: getAiItineraryPlanJsonSchema(tripDates.length),
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new OpenAiItineraryPlanError("provider");
  }

  if (!response.ok) {
    throw new OpenAiItineraryPlanError("provider");
  }

  const responsePayload: unknown = await response.json().catch(() => null);
  const outputText =
    responsePayload && typeof responsePayload === "object"
      ? getOutputText(responsePayload as OpenAiResponse)
      : null;

  if (!outputText) {
    throw new OpenAiItineraryPlanError("invalid-response");
  }

  let output: unknown;

  try {
    output = JSON.parse(outputText);
  } catch {
    throw new OpenAiItineraryPlanError("invalid-response");
  }

  const parsedPlan = aiItineraryPlanSchema.safeParse(output);

  if (!parsedPlan.success) {
    throw new OpenAiItineraryPlanError("invalid-response");
  }

  const validation = validateAiItineraryPlanForTrip(parsedPlan.data, trip);

  if (!validation.success) {
    throw new OpenAiItineraryPlanError("invalid-response");
  }

  return validation.data;
}
