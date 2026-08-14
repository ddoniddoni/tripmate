import { redirect } from "next/navigation";

import { isDevelopmentAuthenticationEnabled } from "@/features/auth/model/development-auth";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { LoginForm } from "@/features/auth/ui/login-form";
import { BrandMark } from "@/shared/ui/brand-mark";

type LoginPageProps = {
  searchParams: Promise<{ auth?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (user) {
    redirect("/trips");
  }

  const allowDevelopmentSession = isDevelopmentAuthenticationEnabled();

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <BrandMark />
        <div>
          <span className="eyebrow">함께 만드는 여행</span>
          <h1 id="login-heading">여행을 계속 계획해 볼까요?</h1>
          <p>
            {allowDevelopmentSession
              ? "이메일만 입력하면 인증 메일 없이 바로 여행을 시작할 수 있어요."
              : "이메일 인증을 완료하면 나의 여행을 안전하게 관리할 수 있어요."}
          </p>
        </div>
        {params.auth === "confirmation-failed" ? (
          <p className="login-message login-message-error" role="alert">
            로그인 링크를 확인하지 못했습니다. 새 링크를 요청해 주세요.
          </p>
        ) : null}
        <LoginForm allowDevelopmentSession={allowDevelopmentSession} />
        <p className="login-help">
          {allowDevelopmentSession
            ? "개발 환경에서는 실제 Supabase 계정으로 바로 로그인합니다. 초대와 공동 편집도 바로 사용할 수 있어요."
            : "인증 링크는 한 번만 사용할 수 있으며, 잠시 후 만료됩니다."}
        </p>
      </section>
    </main>
  );
}
