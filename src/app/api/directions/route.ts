import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { GoogleRoutesError, getGoogleRoute } from "@/features/map-sync/api/google-routes";
import {
  GoogleRoutesUsageLimitError,
  reserveGoogleRoutesUsage,
} from "@/features/map-sync/api/supabase-google-routes-usage";
import { directionsQuerySchema } from "@/features/map-sync/model/directions-adapter";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null);
  const parsedQuery = directionsQuerySchema.safeParse(payload);

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "이동 경로는 장소 2곳에서 12곳까지 계산할 수 있어요." },
      { status: 400 },
    );
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const reservation = await reserveGoogleRoutesUsage();

    if (!reservation.allowed) {
      return NextResponse.json(
        { message: "오늘 실제 이동 경로 계산 한도에 도달했어요. 내일 다시 시도해 주세요." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof GoogleRoutesUsageLimitError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "실제 이동 경로 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  try {
    const route = await getGoogleRoute(parsedQuery.data);

    return NextResponse.json({ route });
  } catch (error) {
    if (error instanceof GoogleRoutesError && error.kind === "configuration") {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { message: "실제 이동 경로를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
