import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/shared/api/supabase/route-handler";
import { getSafeInternalPath } from "@/shared/lib/safe-internal-path";

function isEmailLinkType(value: string | null): value is "email" | "signup" {
  return value === "email" || value === "signup";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeInternalPath(request.nextUrl.searchParams.get("next"));
  const successResponse = NextResponse.redirect(new URL(nextPath, request.url));
  const supabase = createSupabaseRouteHandlerClient(request, successResponse);

  if (tokenHash && isEmailLinkType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return successResponse;
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return successResponse;
    }
  }

  const failureUrl = new URL("/login", request.url);
  failureUrl.searchParams.set("auth", "confirmation-failed");
  failureUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(failureUrl);
}
