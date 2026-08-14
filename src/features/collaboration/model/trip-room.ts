import { z } from "@/shared/lib/zod";

import type { TripMemberRole } from "@/entities/trip/model/trip-membership";

const tripIdSchema = z.uuid();
const tripRoomPrefix = "trip:";

export type CollaborationConnectionStatus =
  | "initial"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export function getTripRoomId(tripId: string) {
  return `${tripRoomPrefix}${tripIdSchema.parse(tripId)}`;
}

export function getTripIdFromRoomId(roomId: string) {
  if (!roomId.startsWith(tripRoomPrefix)) {
    return null;
  }

  const tripId = roomId.slice(tripRoomPrefix.length);

  return tripIdSchema.safeParse(tripId).success ? tripId : null;
}

export function getTripRoomPermissions(role: TripMemberRole) {
  return role === "viewer" ? (["*:read"] as const) : (["*:write"] as const);
}

export function getCollaborationConnectionCopy(status: CollaborationConnectionStatus) {
  switch (status) {
    case "connected":
      return "동기화됨";
    case "reconnecting":
      return "재연결 중";
    case "disconnected":
      return "연결할 수 없음";
    case "connecting":
      return "연결 중";
    case "initial":
      return "연결 준비 중";
  }
}
