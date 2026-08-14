import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/shared/config/public-env", () => ({
  getSupabasePublicConfig: () => ({ key: "public-key", url: "https://tripmate.supabase.co" }),
}));

import { createSupabaseRouteHandlerClient } from "@/shared/api/supabase/route-handler";

describe("createSupabaseRouteHandlerClient", () => {
  const createServerClientMock = vi.mocked(createServerClient);

  beforeEach(() => {
    createServerClientMock.mockReset();
  });

  it("writes a session cookie to the exact response that redirects after confirmation", () => {
    const request = new NextRequest("http://localhost:3000/auth/confirm");
    const response = NextResponse.redirect(new URL("/trips", request.url));
    let setAll: ((cookies: Array<{ name: string; options: { httpOnly: boolean }; value: string }>) => void) | undefined;

    createServerClientMock.mockImplementation((_url, _key, options) => {
      setAll = options.cookies?.setAll as typeof setAll;
      return {} as never;
    });

    createSupabaseRouteHandlerClient(request, response);
    setAll?.([{ name: "sb-tripmate-auth", options: { httpOnly: true }, value: "session" }]);

    expect(response.cookies.get("sb-tripmate-auth")).toMatchObject({
      httpOnly: true,
      value: "session",
    });
  });
});
