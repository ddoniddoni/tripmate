import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import {
  GoogleMapsJavascriptUsageLimitError,
  reserveGoogleMapsJavascriptUsage,
} from "@/features/map-sync/api/supabase-google-maps-javascript-usage";

export const runtime = "nodejs";

export async function POST() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY?.trim()) {
    return NextResponse.json({ message: "지도 키 설정을 확인해 주세요." }, { status: 503 });
  }

  try {
    const reservation = await reserveGoogleMapsJavascriptUsage();

    if (!reservation.allowed) {
      return NextResponse.json(
        { message: "오늘 지도 표시 한도에 도달했어요. 내일 다시 시도해 주세요." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof GoogleMapsJavascriptUsageLimitError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "지도 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  return NextResponse.json({ allowed: true });
}
