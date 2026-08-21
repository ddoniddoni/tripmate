import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import {
  getGooglePlaceDetails,
  GooglePlaceDetailsError,
} from "@/features/place-search/api/google-place-details";
import {
  GooglePlaceDetailsUsageLimitError,
  reserveGooglePlaceDetailsUsage,
} from "@/features/place-search/api/supabase-google-place-details-usage";
import { z } from "@/shared/lib/zod";

const placeDetailsIdSchema = z.string().trim().min(1).max(240);

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const parsedPlaceId = placeDetailsIdSchema.safeParse(request.nextUrl.searchParams.get("placeId"));

  if (!parsedPlaceId.success) {
    return NextResponse.json({ message: "확인할 장소를 먼저 선택해 주세요." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const reservation = await reserveGooglePlaceDetailsUsage();

    if (!reservation.allowed) {
      return NextResponse.json(
        { message: "오늘 장소 상세 정보 조회 한도에 도달했어요. 내일 다시 시도해 주세요." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof GooglePlaceDetailsUsageLimitError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "장소 상세 정보 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  try {
    const details = await getGooglePlaceDetails(parsedPlaceId.data);

    return NextResponse.json({ details });
  } catch (error) {
    if (error instanceof GooglePlaceDetailsError && error.kind === "configuration") {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "장소 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
