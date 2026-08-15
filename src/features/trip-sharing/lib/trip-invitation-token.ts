import { createHash } from "node:crypto";

export function getTripInvitationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
