"use server";

import { redirect } from "next/navigation";

import {
  parseCredentials,
  parseSignUpCredentials,
  type AuthActionState,
} from "@/features/auth/model/credentials";
import { publicEnv } from "@/shared/config/public-env";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { getSafeInternalPath } from "@/shared/lib/safe-internal-path";

function getValidationErrorMessage(error: { issues: ReadonlyArray<{ message: string }> }) {
  return error.issues[0]?.message ?? "입력 내용을 확인해 주세요.";
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentialsResult = parseCredentials(formData);

  if (!credentialsResult.success) {
    return { message: getValidationErrorMessage(credentialsResult.error), status: "error" };
  }

  const response = await (async () => {
    try {
      const supabase = await createSupabaseServerClient();

      return await supabase.auth.signInWithPassword(credentialsResult.data);
    } catch {
      return null;
    }
  })();

  if (!response) {
    return {
      message: "로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  if (response.error) {
    return {
      message: "이메일 또는 비밀번호를 확인해 주세요.",
      status: "error",
    };
  }

  redirect(getSafeInternalPath(formData.get("next")));
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentialsResult = parseSignUpCredentials(formData);

  if (!credentialsResult.success) {
    return { message: getValidationErrorMessage(credentialsResult.error), status: "error" };
  }

  const emailRedirectUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_APP_URL);
  emailRedirectUrl.searchParams.set("next", getSafeInternalPath(formData.get("next")));
  const response = await (async () => {
    try {
      const supabase = await createSupabaseServerClient();

      return await supabase.auth.signUp({
        email: credentialsResult.data.email,
        password: credentialsResult.data.password,
        options: { emailRedirectTo: emailRedirectUrl.toString() },
      });
    } catch {
      return null;
    }
  })();

  if (!response || response.error) {
    return {
      message: "회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  if (response.data.session) {
    redirect(getSafeInternalPath(formData.get("next")));
  }

  redirect("/signup/check-email");
}

export async function signOut(formData?: FormData) {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  if (!formData?.has("next")) {
    redirect("/login");
  }

  redirect(`/login?next=${encodeURIComponent(getSafeInternalPath(formData?.get("next")))}`);
}
