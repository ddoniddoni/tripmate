import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { z } from "@/shared/lib/zod";

import { listSupabaseTripMembers } from "@/entities/trip/api/supabase-trip-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import {
  getTripIdFromRoomId,
  getTripRoomPermissions,
} from "@/features/collaboration/model/trip-room";

const liveblocksAuthRequestSchema = z.object({
  room: z.string().min(1),
});

const collaboratorColors = ["#d56b59", "#4f7fca", "#2f8d69", "#9b6bb5"] as const;

export const runtime = "nodejs";

function getCollaboratorName(email: string | null, userId: string) {
  const emailName = email?.split("@")[0]?.trim();

  return emailName || `여행자 ${userId.slice(0, 6)}`;
}

function getCollaboratorColor(userId: string) {
  let hash = 0;

  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return collaboratorColors[Math.abs(hash) % collaboratorColors.length];
}

async function getRequestedRoomId(request: Request) {
  try {
    const parsed = liveblocksAuthRequestSchema.safeParse(await request.json());

    return parsed.success ? parsed.data.room : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const roomId = await getRequestedRoomId(request);
  const tripId = roomId ? getTripIdFromRoomId(roomId) : null;

  if (!roomId || !tripId) {
    return NextResponse.json({ message: "유효하지 않은 협업 방입니다." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    return NextResponse.json(
      { message: "실시간 협업 설정이 아직 완료되지 않았습니다." },
      { status: 503 },
    );
  }

  try {
    const members = await listSupabaseTripMembers(tripId);
    const membership = members.find((member) => member.userId === user.id);

    if (!membership) {
      return NextResponse.json({ message: "이 여행의 멤버만 참여할 수 있습니다." }, { status: 403 });
    }

    const liveblocks = new Liveblocks({ secret });
    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        color: getCollaboratorColor(user.id),
        name: getCollaboratorName(user.email, user.id),
        role: membership.role,
      },
    });

    session.allow(roomId, getTripRoomPermissions(membership.role));

    const { body, status } = await session.authorize();

    return new Response(body, { status });
  } catch {
    return NextResponse.json({ message: "협업 권한을 확인하지 못했습니다." }, { status: 500 });
  }
}
