"use server";

import { redirect } from "next/navigation";

import {
  parseMagicLinkEmail,
  type MagicLinkActionState,
} from "@/features/auth/model/magic-link";
import { isDevelopmentAuthenticationEnabled } from "@/features/auth/model/development-auth";
import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import { publicEnv } from "@/shared/config/public-env";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export async function requestMagicLink(
  _previousState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const emailResult = parseMagicLinkEmail(formData.get("email"));

  if (!emailResult.success) {
    return { message: emailResult.error.issues[0]?.message ?? "이메일을 확인해 주세요.", status: "error" };
  }

  const supabase = await createSupabaseServerClient();
  const emailRedirectTo = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_APP_URL).toString();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailResult.data,
    options: { emailRedirectTo },
  });

  if (error) {
    return {
      message: "로그인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  return {
    message: "로그인 링크를 보냈어요. 이메일에서 링크를 열어 계속해 주세요.",
    status: "success",
  };
}

export async function startDevelopmentSession(
  _previousState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const emailResult = parseMagicLinkEmail(formData.get("email"));

  if (!emailResult.success) {
    return { message: emailResult.error.issues[0]?.message ?? "이메일을 확인해 주세요.", status: "error" };
  }

  if (!isDevelopmentAuthenticationEnabled()) {
    return {
      message: "개발용 바로 시작은 로컬 개발 환경에서만 사용할 수 있습니다.",
      status: "error",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    email: emailResult.data,
    type: "magiclink",
  });

  if (error || !data) {
    return {
      message: "개발용 계정을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error: verificationError } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });

  if (verificationError) {
    return {
      message: "개발용 로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  redirect("/trips");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/login");
}
