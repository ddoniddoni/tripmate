import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("@/shared/api/supabase/route-handler", () => ({
  createSupabaseRouteHandlerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession, verifyOtp },
  })),
}));

import { GET } from "@/app/auth/confirm/route";

const invitationToken = "a".repeat(43);

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    verifyOtp.mockReset();
    exchangeCodeForSession.mockReset();
  });

  it("verifies a token hash and redirects to protected trips", async () => {
    verifyOtp.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest("http://localhost:3000/auth/confirm?token_hash=opaque&type=email"),
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "opaque", type: "email" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/trips");
  });

  it("exchanges PKCE codes from the default Supabase email redirect", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?code=opaque"));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("opaque");
    expect(response.headers.get("location")).toBe("http://localhost:3000/trips");
  });

  it("returns a non-sensitive failure state when verification fails", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("expired") });

    const response = await GET(
      new NextRequest("http://localhost:3000/auth/confirm?token_hash=opaque&type=email"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?auth=confirmation-failed&next=%2Ftrips",
    );
  });

  it("returns to the invitation after a successful confirmation", async () => {
    verifyOtp.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest(
        `http://localhost:3000/auth/confirm?token_hash=opaque&type=email&next=%2Finvites%2F${invitationToken}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      `http://localhost:3000/invites/${invitationToken}`,
    );
  });
});
