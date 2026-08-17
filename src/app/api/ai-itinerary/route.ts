import { NextRequest, NextResponse } from "next/server";

import { getSupabaseTrip, listSupabaseTripMembers } from "@/entities/trip/api/supabase-trip-repository";
import { getTripPermissions } from "@/entities/trip/model/trip-membership";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import {
  generateOpenAiItineraryPlan,
  OpenAiItineraryPlanError,
} from "@/features/ai-itinerary/api/openai-itinerary-plan";
import { aiItineraryPlanRequestSchema } from "@/features/ai-itinerary/model/ai-itinerary-plan";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null);
  const parsedRequest = aiItineraryPlanRequestSchema.safeParse(payload);

  if (!parsedRequest.success) {
    return NextResponse.json({ message: "여행 정보를 다시 확인해 주세요." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const [trip, members] = await Promise.all([
      getSupabaseTrip(parsedRequest.data.tripId),
      listSupabaseTripMembers(parsedRequest.data.tripId),
    ]);
    const member = members.find((candidate) => candidate.userId === user.id);

    if (!trip || !member) {
      return NextResponse.json({ message: "이 여행에 접근할 수 없습니다." }, { status: 403 });
    }

    if (!getTripPermissions(member.role).canEditItinerary) {
      return NextResponse.json(
        { message: "보기 전용 권한에서는 AI 동선 초안을 만들 수 없습니다." },
        { status: 403 },
      );
    }

    const plan = await generateOpenAiItineraryPlan(trip);

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof OpenAiItineraryPlanError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "AI 동선 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
