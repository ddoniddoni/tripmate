import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import {
  GooglePlaceSearchError,
  searchGooglePlaces,
} from "@/features/place-search/api/google-place-search";
import {
  GooglePlaceSearchUsageLimitError,
  reserveGooglePlaceSearchUsage,
} from "@/features/place-search/api/supabase-google-place-search-usage";
import { z } from "@/shared/lib/zod";

const placeSearchQuerySchema = z.string().trim().min(2).max(200);

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const parsedQuery = placeSearchQuerySchema.safeParse(request.nextUrl.searchParams.get("query"));

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "두 글자 이상의 장소명이나 주소를 입력해 주세요." },
      { status: 400 },
    );
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const reservation = await reserveGooglePlaceSearchUsage();

    if (!reservation.allowed) {
      return NextResponse.json(
        { message: "오늘 장소 검색 한도에 도달했어요. 내일 다시 시도해 주세요." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof GooglePlaceSearchUsageLimitError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "장소 검색 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  try {
    const places = await searchGooglePlaces(parsedQuery.data);

    return NextResponse.json({ places });
  } catch (error) {
    if (error instanceof GooglePlaceSearchError && error.kind === "configuration") {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "장소 검색을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
