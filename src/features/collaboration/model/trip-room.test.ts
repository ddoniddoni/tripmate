import { describe, expect, it } from "vitest";

import {
  getCollaborationConnectionCopy,
  getTripIdFromRoomId,
  getTripRoomId,
  getTripRoomPermissions,
} from "@/features/collaboration/model/trip-room";

const tripId = "77d8ae37-653c-4e6b-a47a-7d3373f0111f";

describe("trip collaboration room", () => {
  it("creates and parses a stable trip-scoped room id", () => {
    expect(getTripRoomId(tripId)).toBe(`trip:${tripId}`);
    expect(getTripIdFromRoomId(`trip:${tripId}`)).toBe(tripId);
  });

  it("rejects room ids outside the trip naming pattern", () => {
    expect(getTripIdFromRoomId("trip:not-a-uuid")).toBeNull();
    expect(getTripIdFromRoomId(`other:${tripId}`)).toBeNull();
  });

  it("grants write access only to owners and editors", () => {
    expect(getTripRoomPermissions("owner")).toEqual(["*:write"]);
    expect(getTripRoomPermissions("editor")).toEqual(["*:write"]);
    expect(getTripRoomPermissions("viewer")).toEqual(["*:read"]);
  });

  it("describes every connection state in Korean", () => {
    expect(getCollaborationConnectionCopy("connected")).toBe("동기화됨");
    expect(getCollaborationConnectionCopy("disconnected")).toBe("연결할 수 없음");
  });
});
